import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem("currentUser");

      return savedUser
        ? JSON.parse(savedUser)
        : null;
    } catch (error) {
      localStorage.removeItem("currentUser");
      return null;
    }
  });

  const refreshUser = useCallback(async () => {
    if (!user?.username) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`http://localhost:8080/api/users/username/${user.username}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const latest = await res.json();
        setUser((prev) => {
          if (!prev) return null;
          const updated = { ...prev, ...latest };
          localStorage.setItem("currentUser", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error("Error refreshing user profile:", err);
    }
  }, [user?.username]);

  useEffect(() => {
    if (user?.username) {
      refreshUser();
    }
  }, [user?.username, refreshUser]);

  const login = (userData) => {
    localStorage.setItem(
      "currentUser",
      JSON.stringify(userData)
    );
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setUser(null);
  };

  const updateUser = (newData) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...newData };
      localStorage.setItem("currentUser", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () =>
  useContext(AuthContext);