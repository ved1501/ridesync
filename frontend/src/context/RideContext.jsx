import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { RideContext } from "./useRide";
import { useAuth } from "./useAuth";
import { authFetch } from "../utils/api";

const API_URL = import.meta.env.VITE_API_URL || "http://192.168.31.200:5000/api";
const SOCKET_URL = "http://192.168.31.200:5000";


// Ride status is authoritative from the backend (Active / In Progress /
// Completed / Cancelled) — we no longer infer "Completed" just because the
// scheduled time has passed. A ride only becomes Completed when the driver
// explicitly marks it so (via Start Ride, then Complete Ride).
const getRideStatus = (ride) => ride.status || "Active";

export function RideProvider({ children }) {
  const { user, token } = useAuth();

  // Load rides from localStorage
  const [rides, setRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(true);

  const [joinedRides, setJoinedRides] = useState([]);

  const formattedJoinedRides = (data) =>
    data.map((booking) => ({
      id: booking.ride_id,
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      bookingStatus: booking.status,
      status: booking.ride_status,

      from: booking.from_location,
      to: booking.to_location,

      ride_date: booking.ride_date,
      departure_time: booking.departure_time,

      date: booking.ride_date
        ? new Date(booking.ride_date).toLocaleDateString("en-IN")
        : "",

      time: booking.departure_time ? booking.departure_time.slice(0, 5) : "",

      vehicle: booking.vehicle,
      price: booking.price,
      seatsAvailable: booking.seats_available,

      driver: {
        id: booking.driver_id,
        name: booking.driver_name,
        email: booking.driver_email,
      },
    }));

  const fetchRides = async () => {
    try {
      const response = await fetch(`${API_URL}/rides`);

      if (!response.ok) {
        throw new Error("Failed to fetch rides");
      }

      const data = await response.json();

      setRides(data);
    } catch (error) {
      console.error("Error fetching rides:", error);
    } finally {
      setLoadingRides(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRides();
  }, []);

  const fetchJoinedRides = async () => {
    if (!user?.id || !token) {
      setJoinedRides([]);
      return;
    }

    try {
      const response = await authFetch(
        `${API_URL}/bookings/user/${user.id}`,
        token,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch joined rides");
      }

      const data = await response.json();

      setJoinedRides(formattedJoinedRides(data));
    } catch (error) {
      console.error("Error fetching joined rides:", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJoinedRides();
  }, [user, token]);

  ////////////////////////////////////////////////////////////////////////////////
  // Real-time ride updates

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("Ride socket connected:", socket.id);

      socket.emit("join_user_room", {
        userId: user.id,
      });
    });

    socket.on("ride_rescheduled", ({ ride }) => {
      console.log("Real-time ride update:", ride);

      // Update offered rides
      setRides((previousRides) =>
        previousRides.map((currentRide) =>
          Number(currentRide.id) === Number(ride.id) ? ride : currentRide,
        ),
      );

      // Update joined ride if this ride exists there
      setJoinedRides((previousJoinedRides) =>
        previousJoinedRides.map((currentRide) =>
          Number(currentRide.id) === Number(ride.id)
            ? {
                ...currentRide,
                status: ride.status,
                ride_date: ride.ride_date,
                departure_time: ride.departure_time,
                date: ride.ride_date
                  ? new Date(ride.ride_date).toLocaleDateString("en-IN")
                  : "",
                time: ride.departure_time
                  ? ride.departure_time.slice(0, 5)
                  : "",
              }
            : currentRide,
        ),
      );
    });

    socket.on("ride_cancelled", ({ ride, bookingId }) => {
      console.log("Real-time ride cancellation:", ride);

      // Update ride status for driver
      setRides((previousRides) =>
        previousRides.map((currentRide) =>
          Number(currentRide.id) === Number(ride.id)
            ? {
                ...currentRide,
                ...ride,
                status: "Cancelled",
              }
            : currentRide,
        ),
      );

      // Update booking status for passenger
      setJoinedRides((previousJoinedRides) =>
        previousJoinedRides.map((currentRide) =>
          Number(currentRide.id) === Number(ride.id)
            ? {
                ...currentRide,
                status: "Cancelled",
                bookingStatus: "Cancelled",
                ...(bookingId ? { bookingId } : {}),
              }
            : currentRide,
        ),
      );
    });

    socket.on("ride_expired", ({ ride }) => {
      console.log("Real-time ride expiry:", ride);

      // Update offered rides
      setRides((previousRides) =>
        previousRides.map((currentRide) =>
          Number(currentRide.id) === Number(ride.id)
            ? {
                ...currentRide,
                ...ride,
                status: "Expired",
              }
            : currentRide,
        ),
      );

      // Update joined rides
      setJoinedRides((previousJoinedRides) =>
        previousJoinedRides.map((currentRide) =>
          Number(currentRide.id) === Number(ride.id)
            ? {
                ...currentRide,
                status: "Expired",
              }
            : currentRide,
        ),
      );
    });

    socket.on("ride_started", ({ ride }) => {
      console.log("Real-time ride started:", ride);

      // Update offered rides
      setRides((previousRides) =>
        previousRides.map((currentRide) =>
          Number(currentRide.id) === Number(ride.id)
            ? {
                ...currentRide,
                ...ride,
                status: "In Progress",
              }
            : currentRide,
        ),
      );

      // Update joined rides
      setJoinedRides((previousJoinedRides) =>
        previousJoinedRides.map((currentRide) =>
          Number(currentRide.id) === Number(ride.id)
            ? {
                ...currentRide,
                status: "In Progress",
              }
            : currentRide,
        ),
      );
    });

    socket.on("ride_completed", ({ ride }) => {
      console.log("Real-time ride completed:", ride);

      // Update offered rides
      setRides((previousRides) =>
        previousRides.map((currentRide) =>
          Number(currentRide.id) === Number(ride.id)
            ? {
                ...currentRide,
                ...ride,
                status: "Completed",
              }
            : currentRide,
        ),
      );

      // Update joined rides
      setJoinedRides((previousJoinedRides) =>
        previousJoinedRides.map((currentRide) =>
          Number(currentRide.id) === Number(ride.id)
            ? {
                ...currentRide,
                status: "Completed",
              }
            : currentRide,
        ),
      );
    });

    socket.on("disconnect", () => {
      console.log("Ride socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  /////////////////////////////////////////////////////////////////////////////////////
  // Join ride function

  const joinRide = async (rideId) => {
    if (!user?.id) {
      return {
        success: false,
        message: "Please login to join a ride.",
      };
    }

    const ride = rides.find((ride) => ride.id === rideId);

    if (!ride) {
      return {
        success: false,
        message: "Ride not found.",
      };
    }

    if (ride.seats_available <= 0) {
      return {
        success: false,
        message: "No seats available.",
      };
    }

    const alreadyJoined = joinedRides.some(
      (joinedRide) =>
        joinedRide.ride_id === rideId ||
        joinedRide.ride?.id === rideId ||
        joinedRide.id === rideId,
    );

    if (alreadyJoined) {
      return {
        success: false,
        message: "You have already joined this ride.",
      };
    }

    try {
      const response = await authFetch(`${API_URL}/bookings`, token, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ride_id: rideId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to join ride.",
        };
      }

      // Backend se updated joined rides fetch karo
      const joinedResponse = await authFetch(
        `${API_URL}/bookings/user/${user.id}`,
        token,
      );

      if (joinedResponse.ok) {
        const joinedData = await joinedResponse.json();
        setJoinedRides(formattedJoinedRides(joinedData));
      }

      // Available seats update
      setRides((previousRides) =>
        previousRides.map((currentRide) =>
          currentRide.id === rideId
            ? {
                ...currentRide,
                seats_available: currentRide.seats_available - 1,
              }
            : currentRide,
        ),
      );

      return {
        success: true,
        message: data.message || "Ride joined successfully!",
        bookingId: data.booking?.booking_id,
      };
    } catch (error) {
      console.error("Error joining ride:", error);

      return {
        success: false,
        message: "Unable to connect to server.",
      };
    }
  };

  //////////////////////////////////////////////////////////////////////////////////

  //leave ride function
  const leaveRide = async (bookingId) => {
    try {
      const response = await authFetch(
        `${API_URL}/bookings/${bookingId}/cancel`,
        token,
        {
          method: "PATCH",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to leave ride.",
        };
      }

      // Joined rides list se remove karo
      // Booking ko remove nahi karna, Cancelled status update karna hai
      setJoinedRides((previousJoinedRides) =>
        previousJoinedRides.map((ride) =>
          Number(ride.bookingId) === Number(bookingId)
            ? {
                ...ride,
                status: "Cancelled",
                bookingStatus: "Cancelled",
              }
            : ride,
        ),
      );

      // Seat count update karo
      if (data.booking) {
        setRides((previousRides) =>
          previousRides.map((ride) =>
            ride.id === data.booking.ride_id
              ? {
                  ...ride,
                  seats_available: ride.seats_available + 1,
                }
              : ride,
          ),
        );
      }

      return {
        success: true,
        message: data.message || "Ride left successfully!",
      };
    } catch (error) {
      console.error("Error leaving ride:", error);

      return {
        success: false,
        message: "Unable to connect to server.",
      };
    }
  };
  //////////////////////////////////////////////////////////////////////////////////
  // Add Ride function

  const addRide = async (newRide) => {
    try {
      console.log("SENT RIDE DATA:", newRide);

      const response = await authFetch(`${API_URL}/rides`, token, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(newRide),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("BACKEND ERROR RESPONSE:", data);
        console.log("STATUS:", response.status);

        return {
          success: false,
          message: data.message || "Failed to offer ride.",
        };
      }

      setRides((previousRides) => [...previousRides, data.ride]);

      return {
        success: true,
        message: data.message || "Ride offered successfully!",
        ride: data.ride,
      };
    } catch (error) {
      console.error("Error offering ride:", error);

      return {
        success: false,
        message: "Unable to connect to server.",
      };
    }
  };

  ////////////////////////////////////////////////////////////////////////////////
  //Delete Ride Function

  const deleteRide = async (rideId) => {
    try {
      const response = await authFetch(`${API_URL}/rides/${rideId}`, token, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to delete ride.",
        };
      }

      // Remove ride from rides
      setRides((previousRides) =>
        previousRides.filter((ride) => ride.id !== rideId),
      );

      // Also mark it cancelled in joined rides if any passenger had it
      setJoinedRides((previousJoinedRides) =>
        previousJoinedRides.map((ride) =>
          Number(ride.id) === Number(rideId)
            ? {
                ...ride,
                status: "Cancelled",
                bookingStatus: "Cancelled",
              }
            : ride,
        ),
      );

      return {
        success: true,
        message: data.message || "Ride deleted successfully!",
      };
    } catch (error) {
      console.error("Error deleting ride:", error);

      return {
        success: false,
        message: "Unable to connect to server.",
      };
    }
  };

  //////////////////////////////////////////////////////////////////////////////
  //Cancel Ride Function

  //////////////////////////////////////////////////////////////////////////
  // Sync a ride's status into shared state after actions taken on the
  // RideDetails page (start/complete/cancel), so Dashboard/MyRides reflect
  // it immediately instead of showing stale data until a full reload.
  const updateRideInState = (rideId, changes) => {
    setRides((previousRides) =>
      previousRides.map((ride) =>
        Number(ride.id) === Number(rideId) ? { ...ride, ...changes } : ride,
      ),
    );

    setJoinedRides((previousJoinedRides) =>
      previousJoinedRides.map((ride) =>
        Number(ride.id) === Number(rideId) ? { ...ride, ...changes } : ride,
      ),
    );
  };

  //////////////////////////////////////////////////////////////////////////

  const cancelRide = (rideId) => {
    const ride = rides.find((ride) => ride.id === rideId);

    if (!ride) {
      return {
        success: false,
        message: "Ride not found.",
      };
    }

    setRides((previousRides) =>
      previousRides.map((ride) =>
        ride.id === rideId
          ? {
              ...ride,
              status: "Cancelled",
            }
          : ride,
      ),
    );

    setJoinedRides((previousJoinedRides) =>
      previousJoinedRides.map((ride) =>
        ride.id === rideId
          ? {
              ...ride,
              status: "Cancelled",
            }
          : ride,
      ),
    );

    return {
      success: true,
      message: "Ride cancelled successfully.",
    };
  };
  /////////////////////////////////////////////////////////////////////////////////
  const updateDriverInfo = (updatedUser) => {
    if (!updatedUser?.email) {
      return;
    }

    setRides((previousRides) =>
      previousRides.map((ride) =>
        ride.driver?.email === updatedUser.email
          ? {
              ...ride,
              driver: {
                ...ride.driver,
                name: updatedUser.name,
                email: updatedUser.email,
              },
            }
          : ride,
      ),
    );

    setJoinedRides((previousJoinedRides) =>
      previousJoinedRides.map((ride) =>
        ride.driver?.email === updatedUser.email
          ? {
              ...ride,
              driver: {
                ...ride.driver,
                name: updatedUser.name,
                email: updatedUser.email,
              },
            }
          : ride,
      ),
    );
  };

  /////////////////////////////////////////////////////////////////////////

  //Update Ride Function

  const updateRide = async (rideId, updatedData) => {
    try {
      const response = await authFetch(`${API_URL}/rides/${rideId}`, token, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to update ride.",
        };
      }

      setRides((previousRides) =>
        previousRides.map((ride) =>
          ride.id === Number(rideId) ? data.ride : ride,
        ),
      );

      return {
        success: true,
        message: data.message || "Ride updated successfully!",
        ride: data.ride,
      };
    } catch (error) {
      console.error("Error updating ride:", error);

      return {
        success: false,
        message: "Unable to connect to server.",
      };
    }
  };

  ////////////////////////////////////////////////////////////////////////////////
  // Reschedule Ride Function

  const rescheduleRide = async (rideId, rideDate, departureTime) => {
    try {
      const response = await authFetch(
        `${API_URL}/rides/${rideId}/reschedule`,
        token,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ride_date: rideDate,
            departure_time: departureTime,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to reschedule ride.",
        };
      }

      // Update the ride immediately in shared state
      setRides((previousRides) =>
        previousRides.map((ride) =>
          Number(ride.id) === Number(rideId) ? data.ride : ride,
        ),
      );

      // Also update joined rides if this ride is present there
      setJoinedRides((previousJoinedRides) =>
        previousJoinedRides.map((ride) =>
          Number(ride.id) === Number(rideId)
            ? {
                ...ride,
                ride_date: data.ride.ride_date,
                departure_time: data.ride.departure_time,
                date: data.ride.ride_date
                  ? new Date(data.ride.ride_date).toLocaleDateString("en-IN")
                  : "",
                time: data.ride.departure_time
                  ? data.ride.departure_time.slice(0, 5)
                  : "",
                status: data.ride.status,
              }
            : ride,
        ),
      );

      return {
        success: true,
        message: data.message || "Ride rescheduled successfully!",
        ride: data.ride,
      };
    } catch (error) {
      console.error("Error rescheduling ride:", error);

      return {
        success: false,
        message: "Unable to connect to server.",
      };
    }
  };

  return (
    <RideContext.Provider
      value={{
        rides,
        joinedRides,
        joinRide,
        leaveRide,
        addRide,
        deleteRide,
        updateRide,
        rescheduleRide,
        updateDriverInfo,
        updateRideInState,
        getRideStatus,
        cancelRide,
        loadingRides,
        fetchJoinedRides,
        fetchRides,
      }}
    >
      {children}
    </RideContext.Provider>
  );
}
