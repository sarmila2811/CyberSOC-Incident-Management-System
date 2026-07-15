import React, { createContext, useEffect, useState, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuth } from "./AuthContext";

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user } = useAuth();
  const username = user?.username;

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!username) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${window.API_BASE_URL}/api/notifications/${username}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data || []);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  }, [username]);

  useEffect(() => {
    if (!username) return;

    fetchNotifications();

    // ================= SOCKET =================
    const client = new Client({
      webSocketFactory: () => new SockJS(window.API_BASE_URL + "/ws"),
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("SOCKET CONNECTED");
        client.subscribe("/topic/notifications", (msg) => {
          const notification = JSON.parse(msg.body);
          if (notification.user === username) {
            setNotifications(prev => {
              if (prev.some(n => n.id === notification.id)) {
                return prev;
              }
              return [notification, ...prev];
            });
          }
          // Increment the refresh trigger for any global notification event
          setRefreshTrigger(prev => prev + 1);
        });
      }
    });

    client.activate();
    return () => client.deactivate();

  }, [username, fetchNotifications]);

  const markAllRead = async () => {
    if (!username) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${window.API_BASE_URL}/api/notifications/read/${username}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${window.API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, setNotifications, markAllRead, markAsRead, refreshNotifications: fetchNotifications, refreshTrigger, triggerRefresh }}>
      {children}
    </NotificationContext.Provider>
  );
};