/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Ref to track if an explicit login() call is in progress.
  // This prevents onAuthStateChange from triggering duplicate or premature
  // admin verification while login() is sequentially authenticating and checking admin_profiles.
  const isLoggingInRef = useRef(false)
  const isInitializedRef = useRef(false)

  /**
   * Verifies whether a given user ID exists in the public.admin_profiles table.
   * Supabase RLS ensures only genuine authenticated admins can read their own row.
   * Returns { isAdmin: boolean, error: object | null }
   */
  const checkAdminProfile = useCallback(async (userId) => {
    if (!userId) {
      return { isAdmin: false, error: null }
    }

    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.warn('Admin profile check query error:', error.message)
        return { isAdmin: false, error }
      }

      // Strictly verify that a matching record was found for this user_id
      const exists = Boolean(data && data.user_id === userId)
      return { isAdmin: exists, error: null }
    } catch (err) {
      console.error('Unexpected error checking admin profile:', err)
      return { isAdmin: false, error: err }
    }
  }, [])

  /**
   * Verifies admin status for an active session and updates context state accordingly.
   * If unauthorized, signs out and resets auth state.
   */
  const verifyAndSetSession = useCallback(
    async (currentSession) => {
      if (!currentSession?.user) {
        setUser(null)
        setSession(null)
        setIsAdmin(false)
        setLoading(false)
        isInitializedRef.current = true
        return false
      }

      const { isAdmin: authorized, error } = await checkAdminProfile(currentSession.user.id)

      if (error) {
        console.warn('Could not verify admin status during session verification:', error)
        // Do not grant admin access on query error
        setUser(null)
        setSession(null)
        setIsAdmin(false)
        setLoading(false)
        isInitializedRef.current = true
        return false
      }

      if (authorized) {
        setSession(currentSession)
        setUser(currentSession.user)
        setIsAdmin(true)
        setLoading(false)
        isInitializedRef.current = true
        return true
      } else {
        // User is authenticated in Supabase but has no record in public.admin_profiles
        try {
          await supabase.auth.signOut()
        } catch (signOutErr) {
          console.warn('Error signing out unauthorized user:', signOutErr)
        }
        setUser(null)
        setSession(null)
        setIsAdmin(false)
        setLoading(false)
        isInitializedRef.current = true
        return false
      }
    },
    [checkAdminProfile]
  )

  useEffect(() => {
    let isMounted = true

    // Single source of truth for auth state changes:
    // Supabase emits INITIAL_SESSION on initialization, followed by SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return

        if (event === 'INITIAL_SESSION') {
          if (currentSession?.user) {
            await verifyAndSetSession(currentSession)
          } else {
            if (isMounted) {
              setUser(null)
              setSession(null)
              setIsAdmin(false)
              setLoading(false)
              isInitializedRef.current = true
            }
          }
        } else if (event === 'SIGNED_IN') {
          // If login() is currently executing, do not run a duplicate/racing admin check
          if (isLoggingInRef.current) {
            return
          }
          if (currentSession?.user) {
            await verifyAndSetSession(currentSession)
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null)
            setSession(null)
            setIsAdmin(false)
            setLoading(false)
          }
        } else if (event === 'TOKEN_REFRESHED') {
          if (isMounted && currentSession) {
            setSession(currentSession)
            setUser(currentSession.user)
          }
        }
      }
    )

    // Fallback safety: ensures loading resolves even if INITIAL_SESSION is unusually delayed
    const timeoutId = setTimeout(async () => {
      if (isMounted && !isInitializedRef.current) {
        try {
          const {
            data: { session: existingSession },
          } = await supabase.auth.getSession()
          if (isMounted && existingSession?.user) {
            await verifyAndSetSession(existingSession)
          } else if (isMounted) {
            setLoading(false)
            isInitializedRef.current = true
          }
        } catch {
          if (isMounted) {
            setLoading(false)
            isInitializedRef.current = true
          }
        }
      }
    }, 1500)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      authListener?.subscription?.unsubscribe()
    }
  }, [verifyAndSetSession])

  /**
   * Authenticate admin user with email and password,
   * immediately validating admin_profiles authorization in predictable sequence.
   */
  const login = async (email, password) => {
    const trimmedEmail = (email || '').trim()
    const rawPassword = password || ''

    if (!trimmedEmail || !rawPassword) {
      throw new Error('Please enter both email and password.')
    }

    isLoggingInRef.current = true

    try {
      // 1. Authenticate with standard Supabase email/password method
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: rawPassword,
      })

      if (authError) {
        // Authentication failure (e.g. invalid credentials, unconfirmed email)
        throw authError
      }

      if (!data?.user) {
        throw new Error('Authentication failed: No user returned by authentication service.')
      }

      // 2. Query public.admin_profiles for exact user_id
      const { isAdmin: authorized, error: profileError } = await checkAdminProfile(data.user.id)

      if (profileError) {
        // PostgREST / network error during admin check
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setIsAdmin(false)
        throw new Error('Unable to verify administrator permissions. Please try again.')
      }

      if (!authorized) {
        // Authorization failure: User is authenticated in Auth, but has NO admin_profiles record
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setIsAdmin(false)
        const deniedError = new Error(
          'Access Denied: This account is not registered as an administrator.'
        )
        deniedError.name = 'AuthorizationError'
        throw deniedError
      }

      // 3. User is both authenticated and authorized as administrator
      setUser(data.user)
      setSession(data.session)
      setIsAdmin(true)
      return data
    } finally {
      isLoggingInRef.current = false
    }
  }

  /**
   * Log out active session
   */
  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      setUser(null)
      setSession(null)
      setIsAdmin(false)
    }
  }

  const value = {
    user,
    session,
    isAdmin,
    loading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>

}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
