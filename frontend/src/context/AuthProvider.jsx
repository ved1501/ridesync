import { useState } from "react";
import { AuthContext } from "./AuthContext";


const API_URL = "http://192.168.31.200:5000/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("currentUser");

    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("authToken") || null;
  });

  // LOGIN
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Login failed.",
        };
      }

      localStorage.setItem("currentUser", JSON.stringify(data.user));
      localStorage.setItem("authToken", data.token);

      setUser(data.user);
      setToken(data.token);

      return {
        success: true,
        message: data.message,
        user: data.user,
      };
    } catch (error) {
      console.error("Login error:", error);

      return {
        success: false,
        message: "Unable to connect to server.",
      };
    }
  };


  // REGISTER
  const register = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Registration failed.",
        };
      }

      return {
        success: true,
        message: data.message,
        user: data.user,
      };
    } catch (error) {
      console.error("Registration error:", error);

      return {
        success: false,
        message: "Unable to connect to server.",
      };
    }
  };


  // LOGOUT
  const logout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authToken");
    setUser(null);
    setToken(null);
  };


  // UPDATE PROFILE
  const updateProfile = async (updatedData) => {
    if (!user) {
      return {
        success: false,
        message: "No user is currently logged in.",
      };
    }

    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: updatedData.name,
          email: updatedData.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to update profile.",
        };
      }

      const updatedUser = {
        ...user,
        name: data.user.name,
        email: data.user.email,
      };

      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      setUser(updatedUser);

      return {
        success: true,
        message: data.message || "Profile updated successfully!",
      };
    } catch (error) {
      console.error("Error updating profile:", error);

      return {
        success: false,
        message: "Unable to connect to server.",
      };
    }
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        register,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}