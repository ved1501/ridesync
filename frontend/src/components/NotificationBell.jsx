import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const API_URL = "http://192.168.31.200:5000/api";
const SOCKET_URL = "http://192.168.31.200:5000";

function NotificationBell({ dropdownClassName = "right-0 top-12" }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${API_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();

    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("Notification socket connected:", socket.id);

      socket.emit("join_user_room", {
        userId: user.id,
      });
    });

    socket.on("new_notification", (notification) => {
      console.log("New real-time notification:", notification);

      setNotifications((previousNotifications) => {
        const alreadyExists = previousNotifications.some(
          (existingNotification) => existingNotification.id === notification.id,
        );

        if (alreadyExists) {
          return previousNotifications;
        }

        return [notification, ...previousNotifications];
      });
    });

    socket.on("disconnect", () => {
      console.log("Notification socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification,
        ),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Normal notifications: just mark as read.
    if (notification.type !== "NEW_MESSAGE") {
      await markAsRead(notification.id);
      return;
    }

    try {
      await markAsRead(notification.id);

      const token = localStorage.getItem("authToken");

      if (!notification.ride_id || !notification.booking_id) {
        console.error(
          "Chat notification is missing ride_id or booking_id:",
          notification,
        );
        return;
      }

      // Get ride → driver ID
      const rideResponse = await fetch(
        `${API_URL}/rides/${notification.ride_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!rideResponse.ok) {
        throw new Error("Failed to load ride");
      }

      const ride = await rideResponse.json();

      // Get booking → passenger ID
      const bookingResponse = await fetch(
        `${API_URL}/bookings/${notification.booking_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!bookingResponse.ok) {
        throw new Error("Failed to load booking");
      }

      const booking = await bookingResponse.json();

      const driverId = Number(ride.driver_id);
      const passengerId = Number(booking.passenger_id);

      // Determine the other person in the chat.
      const receiverId = Number(user.id) === driverId ? passengerId : driverId;

      if (!receiverId || receiverId === Number(user.id)) {
        console.error("Unable to determine chat receiver.");
        return;
      }

      setOpen(false);

      navigate(`/chat/${notification.ride_id}?receiver=${receiverId}`);
    } catch (error) {
      console.error("Error opening chat from notification:", error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${API_URL}/notifications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      setNotifications((previous) =>
        previous.filter((notification) => notification.id !== id),
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const deleteAllNotifications = async () => {
    if (notifications.length === 0) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete all notifications?",
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${API_URL}/notifications`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete notifications");
      }

      setNotifications([]);
    } catch (error) {
      console.error("Error deleting all notifications:", error);
    }
  };

  return (
    <div className="relative">
      {/* Bell */}
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="relative p-2 rounded-full text-slate-600 hover:text-blue-600 hover:bg-white/50 transition-all"
      >
        <Bell size={22} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification dropdown */}
      {open && (
        <div className={`absolute ${dropdownClassName} w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50`}>
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">Notifications</h3>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={deleteAllNotifications}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`w-full px-4 py-3 border-b border-slate-100 transition-colors ${
                    notification.is_read ? "bg-white" : "bg-blue-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Read / unread icon */}
                    <button
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      className="mt-1 shrink-0"
                      title={notification.is_read ? "Read" : "Mark as read"}
                    >
                      <Bell
                        size={17}
                        className={
                          notification.is_read
                            ? "text-slate-400"
                            : "text-blue-600"
                        }
                      />
                    </button>

                    {/* Notification content */}
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="font-semibold text-sm text-slate-900">
                        {notification.title}
                      </p>

                      <p className="text-sm text-slate-600 mt-1">
                        {notification.message}
                      </p>

                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(notification.created_at).toLocaleString(
                          "en-IN",
                        )}
                      </p>
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => deleteNotification(notification.id)}
                      className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete notification"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
