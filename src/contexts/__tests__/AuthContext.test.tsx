import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

// ── Hoisted mocks (must be declared before vi.mock factories) ────────────────
type AuthCb = (event: AuthChangeEvent, session: Session | null) => void;

const mocks = vi.hoisted(() => {
  const callbackRef = { current: null as AuthCb | null };
  return {
    callbackRef,
    unsubscribe: vi.fn(),
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: AuthCb) => {
        mocks.callbackRef.current = cb;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      },
      signUp: mocks.signUp,
      signInWithPassword: mocks.signIn,
      signOut: mocks.signOut,
    },
  },
}));

vi.mock("@/lib/analytics", () => ({
  identifyUser: vi.fn(),
  resetAnalytics: vi.fn(),
}));

// Import AFTER mocks are registered
import { AuthProvider, useAuth } from "../AuthContext";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fakeUser = {
  id: "user-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
} as User;

const fakeSession = {
  user: fakeUser,
  access_token: "tok",
  refresh_token: "ref",
  expires_in: 3600,
  token_type: "bearer",
} as Session;

// ── Consumer components ───────────────────────────────────────────────────────

function StatusConsumer() {
  const { user, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.email ?? "null"}</span>
    </div>
  );
}

function ActionConsumer() {
  const { signUp, signIn, signOut } = useAuth();
  return (
    <div>
      <button onClick={() => signUp("a@b.com", "pass")}>signup</button>
      <button onClick={() => signIn("a@b.com", "pass")}>signin</button>
      <button onClick={() => signOut()}>signout</button>
    </div>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AuthProvider", () => {
  beforeEach(() => {
    mocks.callbackRef.current = null;
    vi.clearAllMocks();
  });

  it("starts in loading state with no user", () => {
    render(
      <AuthProvider>
        <StatusConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId("loading").textContent).toBe("true");
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("sets user and loading=false when auth state fires with a session", async () => {
    render(
      <AuthProvider>
        <StatusConsumer />
      </AuthProvider>
    );

    act(() => mocks.callbackRef.current?.("SIGNED_IN", fakeSession));

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("user").textContent).toBe("test@example.com");
  });

  it("clears user on SIGNED_OUT", async () => {
    render(
      <AuthProvider>
        <StatusConsumer />
      </AuthProvider>
    );

    act(() => mocks.callbackRef.current?.("SIGNED_IN", fakeSession));
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("test@example.com"));

    act(() => mocks.callbackRef.current?.("SIGNED_OUT", null));
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("null"));
  });

  it("unsubscribes from auth events on unmount", () => {
    const { unmount } = render(
      <AuthProvider>
        <StatusConsumer />
      </AuthProvider>
    );
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });

  it("throws when useAuth is used outside AuthProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<StatusConsumer />)).toThrow("useAuth must be used within AuthProvider");
    consoleError.mockRestore();
  });
});

describe("AuthContext actions", () => {
  beforeEach(() => {
    mocks.callbackRef.current = null;
    vi.clearAllMocks();
  });

  it("signUp calls supabase.auth.signUp with email and password", async () => {
    mocks.signUp.mockResolvedValue({ error: null });
    render(
      <AuthProvider>
        <ActionConsumer />
      </AuthProvider>
    );
    await act(async () => screen.getByText("signup").click());
    expect(mocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@b.com", password: "pass" })
    );
  });

  it("signIn calls supabase.auth.signInWithPassword", async () => {
    mocks.signIn.mockResolvedValue({ error: null });
    render(
      <AuthProvider>
        <ActionConsumer />
      </AuthProvider>
    );
    await act(async () => screen.getByText("signin").click());
    expect(mocks.signIn).toHaveBeenCalledWith({ email: "a@b.com", password: "pass" });
  });

  it("signOut calls supabase.auth.signOut", async () => {
    mocks.signOut.mockResolvedValue({});
    render(
      <AuthProvider>
        <ActionConsumer />
      </AuthProvider>
    );
    await act(async () => screen.getByText("signout").click());
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it("signUp propagates the supabase error back to the caller", async () => {
    const authError = new Error("Email already registered");
    mocks.signUp.mockResolvedValue({ error: authError });

    let capturedError: Error | null = null;
    function ErrorConsumer() {
      const { signUp } = useAuth();
      return (
        <button
          onClick={async () => {
            const { error } = await signUp("dup@b.com", "pass");
            capturedError = error;
          }}
        >
          try-signup
        </button>
      );
    }

    render(
      <AuthProvider>
        <ErrorConsumer />
      </AuthProvider>
    );

    await act(async () => screen.getByText("try-signup").click());
    expect(capturedError?.message).toBe("Email already registered");
  });
});
