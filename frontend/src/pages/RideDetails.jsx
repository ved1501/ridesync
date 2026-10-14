import {
  Link,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
// import UserMenu from "../components/UserMenu";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/useAuth";
import { useRide } from "../context/useRide";
import { authFetch } from "../utils/api";
import StarRating from "../components/StarRating";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  CalendarDays,
  Clock3,
  Users,
  Car,
  Star,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import Navbar from "../components/Navbar";
import RideRouteMap from "../components/RideRouteMap";
import DriverReviewsModal from "../components/DriverReviewsModal";
import {
  buildPoints,
  fareBetween,
  seatsBetween,
  shiftOccupancy,
} from "../utils/stops";

const API_URL = import.meta.env.VITE_API_URL || "http://192.168.31.200:5000/api";
const SOCKET_URL = "http://192.168.31.200:5000";

function RideDetails() {
  const { rideId } = useParams();
  const navigate = useNavigate();

  const formatRideDate = (date) => {
    if (!date) return "";

    const [year, month, day] = date.slice(0, 10).split("-");

    const formattedDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    );

    return formattedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [booking, setBooking] = useState(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  const [showReviews, setShowReviews] = useState(false);

  // Stops: which part of the journey the passenger wants to book
  const [searchParams] = useSearchParams();
  const [boardChoice, setBoardChoice] = useState(null);
  const [dropChoice, setDropChoice] = useState(null);
  const [myTrip, setMyTrip] = useState(null);

  const [driverRating, setDriverRating] = useState({
    averageRating: 0,
    reviewCount: 0,
  });

  const [myReview, setMyReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [passengers, setPassengers] = useState([]);
  const [loadingPassengers, setLoadingPassengers] = useState(false);

  // Chat grace-period participants.
  // These are kept separate from confirmed passengers because a cancelled
  // booking must still be able to access chat for 10 minutes.
  const [chatGracePassengers, setChatGracePassengers] = useState([]);

  const { user, token } = useAuth();
  const { fetchJoinedRides, updateRideInState } = useRide();

  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/rides/${rideId}`);

        if (!response.ok) {
          throw new Error("Ride not found");
        }

        const data = await response.json();

        const formattedRide = {
          id: data.id,
          from: data.from_location,
          to: data.to_location,
          rawDate: data.ride_date,
          date: data.ride_date ? formatRideDate(data.ride_date) : "",
          time: data.departure_time.slice(0, 5),
          vehicle: data.vehicle,
          seatsAvailable: data.seats_available,
          price: data.price,
          status: data.status,
          cancelledAt: data.cancelled_at || null,

          // stops along the way + seats taken on each part of the route
          stops: (data.stops || []).map((stop) => ({
            location: stop.location,
            fare: Number(stop.fare),
          })),
          occupancy: data.occupancy || [],
          capacity: data.capacity ?? data.seats_available,

          driver: {
            id: data.driver_id,
            name: data.driver_name,
            email: data.driver_email,
            rating: 5,
          },
        };

        setRide(formattedRide);
      } catch (error) {
        console.error("Error fetching ride:", error);
        setError("Unable to load ride details.");
      } finally {
        setLoading(false);
      }
    };

    fetchRideDetails();
  }, [rideId]);

  useEffect(() => {
    const checkBooking = async () => {
      if (!user?.id || !rideId || !token) return;

      try {
        const response = await authFetch(
          `${API_URL}/bookings/user/${user.id}`,
          token,
        );

        if (!response.ok) {
          return;
        }

        const bookings = await response.json();

        const rideBookings = bookings.filter(
          (item) => item.ride_id === Number(rideId),
        );

        const activeBooking = rideBookings.find(
          (item) => item.status === "Confirmed",
        );

        if (activeBooking) {
          setAlreadyJoined(true);

          setMyTrip({
            from: activeBooking.boarding_location || null,
            to: activeBooking.dropoff_location || null,
            fare:
              activeBooking.fare !== null && activeBooking.fare !== undefined
                ? Number(activeBooking.fare)
                : null,
          });

          setBooking({
            bookingId: activeBooking.booking_code,
            message: "Ride already booked",
          });

          setChatGracePassengers([]);
          return;
        }

        // A passenger who just left still keeps chat access for 10 minutes.
        const cancelledBooking = rideBookings.find(
          (item) =>
            item.status === "Cancelled" &&
            item.cancelled_at &&
            Date.now() <
              new Date(item.cancelled_at).getTime() + 10 * 60 * 1000,
        );

        if (cancelledBooking) {
          const chatAvailableUntil =
            new Date(cancelledBooking.cancelled_at).getTime() +
            10 * 60 * 1000;

          setChatGracePassengers([
            {
              passengerId: user.id,
              passengerName: user.name,
              passengerEmail: user.email,
              bookingId: cancelledBooking.id,
              chatAvailableUntil,
              reason: "Ride left",
            },
          ]);
        } else {
          setChatGracePassengers([]);
        }
      } catch (error) {
        console.error("Error checking booking:", error);
      }
    };

    checkBooking();
  }, [user?.id, rideId, token]);

  useEffect(() => {
    const fetchDriverRating = async () => {
      if (!ride?.driver?.id) return;

      try {
        const response = await fetch(
          `${API_URL}/reviews/driver/${ride.driver.id}`,
        );

        if (!response.ok) return;

        const data = await response.json();

        setDriverRating({
          averageRating: data.averageRating,
          reviewCount: data.reviewCount,
        });
      } catch (error) {
        console.error("Error fetching driver rating:", error);
      }
    };

    fetchDriverRating();
  }, [ride?.driver?.id]);

  useEffect(() => {
    const checkMyReview = async () => {
      if (!user?.id || !rideId || !token) return;

      try {
        const response = await authFetch(
          `${API_URL}/reviews/ride/${rideId}/mine`,
          token,
        );

        if (!response.ok) return;

        const data = await response.json();

        if (data.reviewed) {
          setMyReview(data.review);
        }
      } catch (error) {
        console.error("Error checking review status:", error);
      }
    };

    checkMyReview();
  }, [user?.id, rideId, token]);

  const isOwnRide =
    ride?.driver?.email === user?.email || ride?.driver?.name === user?.name;

  useEffect(() => {
    const fetchPassengers = async () => {
      if (!ride?.id || !isOwnRide || !token) return;

      try {
        setLoadingPassengers(true);

        const response = await authFetch(
          `${API_URL}/bookings/ride/${ride.id}/passengers`,
          token,
        );

        if (!response.ok) {
          setPassengers([]);
          return;
        }

        const data = await response.json();

        setPassengers(data);
      } catch (error) {
        console.error("Error fetching passengers:", error);
        setPassengers([]);
      } finally {
        setLoadingPassengers(false);
      }
    };

    fetchPassengers();
  }, [ride?.id, isOwnRide, token]);


  // ==========================================================
  // Driver chat grace participants
  // Includes confirmed passengers + passengers who left/cancelled
  // within the last 10 minutes.
  // ==========================================================
  useEffect(() => {
    const fetchChatGracePassengers = async () => {
      if (!ride?.id || !isOwnRide || !token) return;

      try {
        const response = await authFetch(
          `${API_URL}/bookings/ride/${ride.id}/chat-participants`,
          token,
        );

        if (!response.ok) {
          setChatGracePassengers([]);
          return;
        }

        const data = await response.json();

        const now = Date.now();

        const gracePassengers = data
          .filter(
            (passenger) =>
              passenger.status === "Cancelled" &&
              passenger.cancelled_at &&
              now <
                new Date(passenger.cancelled_at).getTime() +
                  10 * 60 * 1000,
          )
          .map((passenger) => ({
            ...passenger,
            chatAvailableUntil:
              new Date(passenger.cancelled_at).getTime() +
              10 * 60 * 1000,
            reason: "Ride left",
          }));

        setChatGracePassengers(gracePassengers);
      } catch (error) {
        console.error("Error fetching chat grace participants:", error);
        setChatGracePassengers([]);
      }
    };

    fetchChatGracePassengers();
  }, [ride?.id, isOwnRide, token]);

  // Remove chat-grace participants automatically when their 10-minute
  // window expires. Old messages are never deleted.
  useEffect(() => {
    if (chatGracePassengers.length === 0) return;

    const timers = chatGracePassengers.map((participant) => {
      const remainingTime =
        participant.chatAvailableUntil - Date.now();

      return window.setTimeout(() => {
        setChatGracePassengers((previous) =>
          previous.filter(
            (item) =>
              Number(item.passengerId) !== Number(participant.passengerId),
          ),
        );
      }, Math.max(remainingTime, 0));
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [chatGracePassengers]);

  useEffect(() => {
    if (!ride?.id || !user?.id || !token) return;

    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("RideDetails socket connected:", socket.id);

      socket.emit("join_user_room", {
        userId: user.id,
      });
    });

    // ==========================================================
    // Passenger joined the ride
    // Driver only
    // ==========================================================
    socket.on("ride_booking_created", async (data) => {
      if (!isOwnRide) return;

      if (Number(data.rideId) !== Number(ride.id)) {
        return;
      }

      console.log("New passenger joined this ride:", data);

      // Update available seats immediately
      setRide((previousRide) => ({
        ...previousRide,
        seatsAvailable: data.seatsAvailable,
      }));

      // Refresh passenger list without page refresh
      try {
        const response = await authFetch(
          `${API_URL}/bookings/ride/${ride.id}/passengers`,
          token,
        );

        if (!response.ok) {
          return;
        }

        const passengersData = await response.json();

        setPassengers(passengersData);
      } catch (error) {
        console.error("Error updating passengers in real-time:", error);
      }
    });

    // ==========================================================
    // Passenger left the ride
    // Driver + Passenger
    // ==========================================================
    socket.on("ride_booking_cancelled", async (data) => {
      if (Number(data.rideId) !== Number(ride.id)) {
        return;
      }

      console.log("Passenger left this ride:", data);

      // Update available seats immediately.
      setRide((previousRide) => ({
        ...previousRide,
        seatsAvailable: data.seatsAvailable,
      }));

      // Driver: remove from confirmed passenger list, but keep a separate
      // 10-minute chat-grace entry.
      if (isOwnRide) {
        setPassengers((previousPassengers) =>
          previousPassengers.filter(
            (passenger) =>
              Number(passenger.booking_id) !== Number(data.bookingId),
          ),
        );

        try {
          const response = await authFetch(
            `${API_URL}/bookings/ride/${ride.id}/chat-participants`,
            token,
          );

          if (response.ok) {
            const data = await response.json();
            const now = Date.now();

            const gracePassengers = data
              .filter(
                (passenger) =>
                  passenger.status === "Cancelled" &&
                  passenger.cancelled_at &&
                  now <
                    new Date(passenger.cancelled_at).getTime() +
                      10 * 60 * 1000,
              )
              .map((passenger) => ({
                ...passenger,
                chatAvailableUntil:
                  new Date(passenger.cancelled_at).getTime() +
                  10 * 60 * 1000,
                reason: "Ride left",
              }));

            setChatGracePassengers(gracePassengers);
          }
        } catch (error) {
          console.error(
            "Error refreshing chat grace participants:",
            error,
          );
        }

        return;
      }

      // Passenger: keep the cancelled booking as a chat-grace entry.
      if (Number(data.passengerId) === Number(user.id)) {
        const chatAvailableUntil = Date.now() + 10 * 60 * 1000;

        setAlreadyJoined(false);
        setBooking(null);

        setChatGracePassengers([
          {
            passengerId: user.id,
            passengerName: user.name,
            passengerEmail: user.email,
            bookingId: data.bookingId,
            chatAvailableUntil,
            reason: "Ride left",
          },
        ]);
      }
    });

    // ==========================================================
    // Ride Cancelled
    // Driver + Passenger
    // ==========================================================
    socket.on("ride_cancelled", async (data) => {
      const cancelledRideId = data?.ride?.id ?? data?.rideId;

      if (Number(cancelledRideId) !== Number(ride.id)) {
        return;
      }

      console.log("Real-time ride cancelled:", data);

      setRide((previousRide) => ({
        ...previousRide,
        status: "Cancelled",
        cancelledAt:
          data?.ride?.cancelled_at ||
          data?.ride?.cancelledAt ||
          previousRide.cancelledAt ||
          new Date().toISOString(),
      }));

      updateRideInState(ride.id, {
        status: "Cancelled",
      });

      if (isOwnRide) {
        // The ride is cancelled, so there are no longer any confirmed
        // passengers. Clear the normal passenger list immediately.
        // Cancelled passengers are shown only in chatGracePassengers
        // for the 10-minute chat window.
        setPassengers([]);

        // Driver can still chat with passengers for 10 minutes after
        // cancelling the ride.
        try {
          const response = await authFetch(
            `${API_URL}/bookings/ride/${ride.id}/chat-participants`,
            token,
          );

          if (response.ok) {
            const data = await response.json();
            const now = Date.now();

            const gracePassengers = data
              .filter(
                (passenger) =>
                  passenger.status === "Cancelled" &&
                  passenger.cancelled_at &&
                  now <
                    new Date(passenger.cancelled_at).getTime() +
                      10 * 60 * 1000,
              )
              .map((passenger) => ({
                ...passenger,
                chatAvailableUntil:
                  new Date(passenger.cancelled_at).getTime() +
                  10 * 60 * 1000,
                reason: "Ride cancelled",
              }));

            setChatGracePassengers(gracePassengers);
          }
        } catch (error) {
          console.error(
            "Error loading chat participants after cancellation:",
            error,
          );
        }
      } else {
        // Passenger can still chat with the driver for 10 minutes.
        const cancellationTime =
          data?.ride?.cancelled_at ||
          data?.ride?.cancelledAt ||
          new Date().toISOString();

        const chatAvailableUntil =
          new Date(cancellationTime).getTime() + 10 * 60 * 1000;

        if (Date.now() < chatAvailableUntil) {
          setAlreadyJoined(false);
          setBooking(null);

          setChatGracePassengers([
            {
              passengerId: user.id,
              passengerName: user.name,
              passengerEmail: user.email,
              chatAvailableUntil,
              reason: "Ride cancelled",
            },
          ]);
        }
      }
    });

    // ==========================================================
    // Ride Started
    // Driver + Passenger
    // ==========================================================
    socket.on("ride_started", ({ ride: startedRide }) => {
      if (Number(startedRide.id) !== Number(ride.id)) {
        return;
      }

      console.log("Real-time ride started:", startedRide);

      // Update RideDetails UI immediately
      setRide((previousRide) => ({
        ...previousRide,
        status: "In Progress",
      }));

      // Update shared RideContext
      updateRideInState(ride.id, {
        status: "In Progress",
      });
    });

    // ==========================================================
    // Ride Completed
    // Driver + Passenger
    // ==========================================================
    socket.on("ride_completed", ({ ride: completedRide }) => {
      if (Number(completedRide.id) !== Number(ride.id)) {
        return;
      }

      console.log("Real-time ride completed:", completedRide);

      // Update RideDetails UI immediately
      setRide((previousRide) => ({
        ...previousRide,
        status: "Completed",
      }));

      // Update shared RideContext
      updateRideInState(ride.id, {
        status: "Completed",
      });
    });

    socket.on("disconnect", () => {
      console.log("RideDetails socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [ride?.id, isOwnRide, user?.id, token, updateRideInState]);

  const gracePeriodEnded =
    ride?.rawDate &&
    ride?.time &&
    new Date(
      new Date(`${ride.rawDate}T${ride.time}`).getTime() + 30 * 60 * 1000,
    ) < new Date();

  // Which part of the journey is selected (from the search link or the
  // dropdowns). Without stops this is simply start -> destination.
  const resolveTrip = () => {
    const lastIndex = (ride?.stops?.length ?? 0) + 1;

    const queryBoard = searchParams.get("board");
    const queryDrop = searchParams.get("drop");

    const wantedBoard =
      boardChoice ??
      (queryBoard !== null && Number.isInteger(Number(queryBoard))
        ? Number(queryBoard)
        : 0);

    const wantedDrop =
      dropChoice ??
      (queryDrop !== null && Number.isInteger(Number(queryDrop))
        ? Number(queryDrop)
        : lastIndex);

    const board = Math.min(Math.max(wantedBoard, 0), lastIndex - 1);
    const drop = Math.min(Math.max(wantedDrop, board + 1), lastIndex);

    return { board, drop, lastIndex };
  };

  const handleJoinRide = async () => {
    if (!user?.id) {
      alert("Please login first");
      return;
    }

    const trip = resolveTrip();

    console.log("Booking request:", {
      ride_id: ride.id,
      user,
    });

    try {
      const response = await authFetch(`${API_URL}/bookings`, token, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ride_id: ride.id,
          board_index: trip.board,
          drop_index: trip.drop,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      setBooking({
        bookingId: data.booking.booking_code,
        message: data.message,
      });

      setAlreadyJoined(true);

      // Remember which part of the journey was booked
      const joinedPoints = buildPoints(ride);

      setMyTrip({
        from: joinedPoints[trip.board].location,
        to: joinedPoints[trip.drop].location,
        fare:
          data.booking.fare !== null && data.booking.fare !== undefined
            ? Number(data.booking.fare)
            : fareBetween(ride, trip.board, trip.drop),
      });

      // Update the seats taken on that part of the route immediately
      setRide((previousRide) => ({
        ...previousRide,
        occupancy: shiftOccupancy(
          previousRide.occupancy,
          trip.board,
          trip.drop,
          1,
        ),
      }));

      // Sync context so My Rides page shows this ride without needing a refresh
      await fetchJoinedRides();
    } catch (error) {
      console.error("Error booking ride:", error);
      alert("Failed to book ride");
    }
  };

  const handleLeaveRide = async () => {
    if (!booking?.bookingId) {
      alert("Booking information not found");
      return;
    }

    try {
      const bookingsResponse = await authFetch(
        `${API_URL}/bookings/user/${user.id}`,
        token,
      );

      const bookings = await bookingsResponse.json();

      const activeBooking = bookings.find(
        (item) => item.ride_id === ride.id && item.status === "Confirmed",
      );

      if (!activeBooking) {
        alert("Active booking not found");
        return;
      }

      const response = await authFetch(
        `${API_URL}/bookings/${activeBooking.id}/cancel`,
        token,
        {
          method: "PATCH",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      setAlreadyJoined(false);
      setBooking(null);

      // Keep Chat available for exactly 10 minutes after leaving.
      setChatGracePassengers([
        {
          passengerId: user.id,
          passengerName: user.name,
          passengerEmail: user.email,
          bookingId: activeBooking.id,
          chatAvailableUntil: Date.now() + 10 * 60 * 1000,
          reason: "Ride left",
        },
      ]);

      // Free the seat on the part of the route this passenger had booked
      const leftBoard = activeBooking.board_index ?? 0;
      const leftDrop = activeBooking.drop_index ?? ride.stops.length + 1;

      setMyTrip(null);

      setRide((previousRide) => ({
        ...previousRide,
        occupancy: shiftOccupancy(
          previousRide.occupancy,
          leftBoard,
          leftDrop,
          -1,
        ),
      }));

      // Sync context so the Cancelled section on My Rides reflects this immediately
      await fetchJoinedRides();

      alert(data.message);
    } catch (error) {
      console.error("Error leaving ride:", error);
      alert("Failed to leave ride");
    }
  };

  const handleSubmitReview = async () => {
    if (reviewRating < 1) {
      alert("Please select a star rating.");
      return;
    }

    setSubmittingReview(true);

    try {
      const response = await authFetch(`${API_URL}/reviews`, token, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ride_id: ride.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to submit review.");
        setSubmittingReview(false);
        return;
      }

      setMyReview(data.review);
      setSubmittingReview(false);

      // Refresh the driver's average rating to include this new review
      const summaryResponse = await fetch(
        `${API_URL}/reviews/driver/${ride.driver.id}`,
      );

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setDriverRating({
          averageRating: summaryData.averageRating,
          reviewCount: summaryData.reviewCount,
        });
      }

      alert("Thanks for your review!");
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Unable to connect to server.");
      setSubmittingReview(false);
    }
  };

  const handleStartRide = async () => {
    const confirmed = window.confirm(
      "Start this ride? Passengers will be able to see it's in progress.",
    );

    if (!confirmed) return;

    try {
      const response = await authFetch(
        `${API_URL}/rides/${ride.id}/start`,
        token,
        {
          method: "PUT",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to start ride.");
        return;
      }

      setRide((previousRide) => ({
        ...previousRide,
        status: "In Progress",
      }));

      updateRideInState(ride.id, { status: "In Progress" });

      alert(data.message);
    } catch (error) {
      console.error("Error starting ride:", error);
      alert("Unable to connect to server.");
    }
  };

  const handleCompleteRide = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to mark this ride as completed?",
    );

    if (!confirmed) return;

    try {
      const response = await authFetch(
        `${API_URL}/rides/${ride.id}/complete`,
        token,
        {
          method: "PUT",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to complete ride.");
        return;
      }

      updateRideInState(ride.id, { status: "Completed" });

      alert(data.message);
      navigate("/my-rides");
    } catch (error) {
      console.error("Error completing ride:", error);
      alert("Unable to connect to server.");
    }
  };

  if (loading) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading ride details...</p>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center max-w-md">
          <div className="text-5xl">🚗</div>

          <h1 className="text-2xl font-bold text-slate-900 mt-5">
            Ride not found
          </h1>

          <p className="text-slate-500 mt-2">
            {error || "The ride you're looking for doesn't exist."}
          </p>

          <Link
            to="/find-ride"
            className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            <ArrowLeft size={18} />
            Back to Rides
          </Link>
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center max-w-md">
          <div className="text-5xl">🚗</div>

          <h1 className="text-2xl font-bold text-slate-900 mt-5">
            Ride not found
          </h1>

          <p className="text-slate-500 mt-2">
            The ride you're looking for doesn't exist or may have been removed.
          </p>

          <Link
            to="/find-ride"
            className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            <ArrowLeft size={18} />
            Back to Rides
          </Link>
        </div>
      </div>
    );
  }

  // Selected part of the journey, its fare and the seats free on it
  const { board: tripBoard, drop: tripDrop } = resolveTrip();
  const tripPoints = buildPoints(ride);
  const tripSeats = seatsBetween(ride, tripBoard, tripDrop);
  const tripFare = fareBetween(ride, tripBoard, tripDrop);
  const hasStops = ride.stops.length > 0;
  const hasJoined = alreadyJoined || Boolean(booking);
  const displayFare =
    hasJoined && myTrip?.fare !== null && myTrip?.fare !== undefined
      ? myTrip.fare
      : tripFare;
  const visibleSeats = isOwnRide ? ride.seatsAvailable : tripSeats;

  return (
    <div className="relative z-10 min-h-screen">
      {/* Navbar */}
      <Navbar />

      {/* Main */}
      <main className="max-w-5xl mx-auto px-8 py-10 pb-32 md:pb-10">
        <div className="glass-crystal rounded-3xl p-8 md:p-10">
          {/* Back */}
          <Link
            to="/find-ride"
            className="inline-flex items-center gap-2 text-slate-100 hover:text-blue-600"
          >
            <ArrowLeft size={18} />
            Back to Rides
          </Link>

          {/* Heading */}
          <div className="mt-6">
            <h1 className="text-3xl font-bold text-slate-900">Ride Details</h1>

            <p className="text-slate-100 mt-2">
              {ride.status === "Cancelled"
                ? "This ride has been cancelled."
                : ride.status === "Expired"
                  ? "This ride has expired and can be rescheduled by the driver."
                  : ride.status === "In Progress"
                    ? "This ride is currently in progress."
                    : ride.status === "Completed"
                      ? "This ride has been completed."
                      : "Review the ride details before joining."}
            </p>
          </div>

          {/* Route Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-8 mt-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              {/* From */}
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <MapPin size={22} className="text-blue-600" />
                </div>

                <div>
                  <p className="text-sm text-slate-500">FROM</p>

                  <p className="text-xl font-bold text-slate-900">
                    {ride.from}
                  </p>
                </div>
              </div>

              {/* Route line */}
              <div className="hidden md:flex items-center justify-center">
                <Navigation size={25} className="text-blue-600" />
              </div>

              {/* To */}
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <MapPin size={22} className="text-green-600" />
                </div>

                <div>
                  <p className="text-sm text-slate-500">TO</p>

                  <p className="text-xl font-bold text-slate-900">{ride.to}</p>
                </div>
              </div>
            </div>

            {/* Date and Time */}
            <div className="border-t border-slate-200 mt-8 pt-6 flex flex-wrap gap-8">
              <div className="flex items-center gap-3">
                <CalendarDays size={20} className="text-blue-600" />

                <div>
                  <p className="text-xs text-slate-500">DATE</p>

                  <p className="font-semibold text-slate-900">{ride.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock3 size={20} className="text-blue-600" />

                <div>
                  <p className="text-xs text-slate-500">DEPARTURE</p>

                  <p className="font-semibold text-slate-900">{ride.time}</p>
                </div>
              </div>
            </div>

            {/* Route map */}
            <div className="mt-6">
              <RideRouteMap
                from={ride.from}
                to={ride.to}
                stops={ride.stops.map((stop) => stop.location)}
              />
            </div>

            {/* Stops timeline */}
            {hasStops && (
              <div className="mt-6 border-t border-slate-200 pt-6">
                <h3 className="font-semibold text-slate-900">
                  Route and stops
                </h3>

                <ol className="mt-4">
                  {tripPoints.map((point, i) => {
                    const isFirst = i === 0;
                    const isLast = i === tripPoints.length - 1;

                    return (
                      <li key={point.index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow ${
                              isFirst
                                ? "bg-blue-600"
                                : isLast
                                  ? "bg-green-600"
                                  : "bg-amber-500"
                            }`}
                          />
                          {!isLast && (
                            <span className="w-0.5 flex-1 bg-slate-300 my-1" />
                          )}
                        </div>

                        <div className="pb-4">
                          <p className="font-medium text-slate-900 leading-tight">
                            {point.location}
                          </p>

                          <p className="text-xs text-slate-500 mt-0.5">
                            {isFirst
                              ? "Start"
                              : isLast
                                ? `Destination · ₹${point.fare} from start`
                                : `Stop ${i} · ₹${point.fare} from start`}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {/* Driver */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <h2 className="text-lg font-bold text-slate-900">Driver</h2>

              <div className="flex items-center gap-4 mt-5">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-600">
                    {ride.driver.name.charAt(0)}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    {ride.driver.name}
                  </h3>

                  <button
                    type="button"
                    disabled={driverRating.reviewCount === 0}
                    onClick={() => setShowReviews(true)}
                    className="flex items-center gap-1 mt-1 text-sm text-slate-600 enabled:hover:text-blue-600 disabled:cursor-default"
                  >
                    <Star
                      size={15}
                      className="fill-yellow-400 text-yellow-400"
                    />
                    {driverRating.reviewCount > 0
                      ? `${driverRating.averageRating.toFixed(1)} (${driverRating.reviewCount} review${driverRating.reviewCount === 1 ? "" : "s"})`
                      : "No reviews yet"}
                    {driverRating.reviewCount > 0 && (
                      <span className="ml-1 text-blue-600 underline">
                        See reviews
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5 text-sm text-green-600">
                <ShieldCheck size={18} />
                Verified Rider
              </div>

              {showReviews && (
                <DriverReviewsModal
                  driverId={ride.driver.id}
                  driverName={ride.driver.name}
                  apiUrl={API_URL}
                  onClose={() => setShowReviews(false)}
                />
              )}
            </div>

            {/* Vehicle */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <h2 className="text-lg font-bold text-slate-900">Vehicle</h2>

              <div className="flex items-center gap-4 mt-5">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Car size={28} className="text-blue-600" />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    {ride.vehicle}
                  </h3>

                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <Users size={16} />
                    {visibleSeats} seats available
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Passengers */}
          {isOwnRide && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Passengers</h2>

                <span className="text-sm text-slate-500">
                  {passengers.length} passenger
                  {passengers.length === 1 ? "" : "s"}
                </span>
              </div>

              {loadingPassengers ? (
                <p className="text-sm text-slate-500 mt-5">
                  Loading passengers...
                </p>
              ) : passengers.length === 0 &&
                chatGracePassengers.length === 0 ? (
                <div className="mt-5 p-4 bg-slate-50 rounded-xl text-center">
                  <Users size={28} className="mx-auto text-slate-400" />

                  <p className="text-sm text-slate-500 mt-2">
                    No passengers have joined this ride yet.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {passengers.map((passenger) => (
                    <div
                      key={passenger.booking_id}
                      className="flex items-center justify-between gap-4 p-4 border border-slate-200 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="font-bold text-blue-600">
                            {passenger.passenger_name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {passenger.passenger_name}
                          </p>

                          <p className="text-sm text-slate-500">
                            {passenger.passenger_email}
                          </p>

                          {passenger.boarding_location && (
                            <p className="text-xs text-blue-700 mt-1">
                              {passenger.boarding_location} →{" "}
                              {passenger.dropoff_location}
                              {passenger.fare !== null &&
                                passenger.fare !== undefined &&
                                ` · ₹${Number(passenger.fare)}`}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          navigate(
                            `/chat/${ride.id}?receiver=${passenger.passenger_id}`,
                          )
                        }
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <MessageCircle size={18} />
                        <span className="hidden md:inline">Chat</span>
                      
                      </button>
                    </div>
                  ))}

                  {chatGracePassengers.map((passenger) => (
                    <div
                      key={`chat-grace-${passenger.booking_id || passenger.passengerId}`}
                      className="flex items-center justify-between gap-4 p-4 border border-amber-200 bg-amber-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center">
                          <span className="font-bold text-amber-700">
                            {passenger.passenger_name
                              ?.charAt(0)
                              ?.toUpperCase() ||
                              passenger.passengerName
                                ?.charAt(0)
                                ?.toUpperCase()}
                          </span>
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {passenger.passenger_name ||
                              passenger.passengerName}
                          </p>

                          <p className="text-sm text-slate-500">
                            {passenger.passenger_email ||
                              passenger.passengerEmail}
                          </p>

                          <p className="text-xs text-amber-700 mt-1">
                            {passenger.reason === "Ride cancelled"
                              ? "Ride cancelled — chat available for 10 minutes"
                              : "Passenger left — chat available for 10 minutes"}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          navigate(
                            `/chat/${ride.id}?receiver=${
                              passenger.passenger_id || passenger.passengerId
                            }`,
                          )
                        }
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <MessageCircle size={18} />
                        <span className="hidden md:inline">Chat</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {booking && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-green-800">
                    Ride Joined Successfully!
                  </h3>

                  <p className="text-sm text-green-700 mt-1">
                    Your seat has been confirmed.
                  </p>

                  {myTrip?.from && (
                    <p className="text-sm text-green-800 font-medium mt-2">
                      Your trip: {myTrip.from} → {myTrip.to}
                      {myTrip.fare !== null && ` · ₹${myTrip.fare}`}
                    </p>
                  )}

                  <div className="mt-4">
                    <p className="text-xs text-green-600 font-medium">
                      BOOKING ID
                    </p>

                    <p className="text-lg font-bold text-green-900">
                      {booking.bookingId}
                    </p>
                  </div>

                  <p className="text-xs text-green-600 mt-3">
                    Status: Confirmed
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rate this Ride */}
          {ride.status === "Completed" &&
            !isOwnRide &&
            (alreadyJoined || booking) &&
            (myReview ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 mt-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Your Review
                </h2>

                <div className="mt-3">
                  <StarRating value={myReview.rating} />
                </div>

                {myReview.comment && (
                  <p className="text-slate-600 mt-3">{myReview.comment}</p>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 mt-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Rate this ride
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  How was your trip with {ride.driver.name}?
                </p>

                <div className="mt-4">
                  <StarRating value={reviewRating} onChange={setReviewRating} />
                </div>

                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Share your experience (optional)"
                  rows={3}
                  className="w-full mt-4 px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                />

                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            ))}

          {/* Chat Grace Period */}
          {!isOwnRide &&
            chatGracePassengers.length > 0 &&
            !alreadyJoined &&
            !booking && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-amber-800">
                      {chatGracePassengers[0].reason === "Ride cancelled"
                        ? "Ride Cancelled"
                        : "Ride Left"}
                    </h2>

                    <p className="text-sm text-amber-700 mt-1">
                      You can continue this chat for 10 minutes. Previous
                      messages will remain available.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      navigate(
                        `/chat/${ride.id}?receiver=${ride.driver.id}`,
                      )
                    }
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={19} />
                    Chat with Driver
                  </button>
                </div>
              </div>
            )}

          {/* Choose boarding and drop-off (rides with stops) */}
          {!isOwnRide &&
            hasStops &&
            ride.status === "Active" &&
            !hasJoined &&
            !gracePeriodEnded && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 mt-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Choose your trip
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Get on and off at any point on this route.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Boarding point
                    </label>

                    <select
                      value={tripBoard}
                      onChange={(event) => {
                        setBoardChoice(Number(event.target.value));
                        setDropChoice(null);
                      }}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      {tripPoints.slice(0, -1).map((point) => (
                        <option key={point.index} value={point.index}>
                          {point.location}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Drop-off point
                    </label>

                    <select
                      value={tripDrop}
                      onChange={(event) =>
                        setDropChoice(Number(event.target.value))
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      {tripPoints.slice(tripBoard + 1).map((point) => (
                        <option key={point.index} value={point.index}>
                          {point.location}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mt-4">
                  Fare: <b>₹{tripFare}</b> · Seats free on this part:{" "}
                  <b>{tripSeats}</b>
                </p>
              </div>
            )}

          {/* Join Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-sm text-slate-500">
                  {hasStops && !isOwnRide
                    ? "Your fare for this trip"
                    : "Contribution per seat"}
                </p>

                <p className="text-3xl font-bold text-slate-900 mt-1">
                  ₹{displayFare}
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  {visibleSeats} seats currently available
                </p>
              </div>
              {ride.status === "Cancelled" ? (
                <div className="text-center text-slate-500 py-3">
                  Ride Cancelled
                </div>
              ) : ride.status === "Expired" ? (
                isOwnRide ? (
                  <div className="space-y-3 w-full md:w-auto">
                    <div className="text-center text-amber-500 py-2">
                      This ride has expired.
                    </div>

                    <Link
                      to={`/edit-ride/${ride.id}?reschedule=true`}
                      className="block w-full text-center px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all active:scale-[0.98]"
                    >
                      Reschedule Ride
                    </Link>
                  </div>
                ) : (
                  <div className="text-center text-amber-500 py-3">
                    This ride has expired.
                  </div>
                )
              ) : ride.status === "Completed" ? (
                <div className="text-center text-slate-500 py-3">
                  Ride Completed
                </div>
              ) : isOwnRide ? (
                ride.status === "In Progress" ? (
                  <button
                    onClick={handleCompleteRide}
                    className="px-6 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all active:scale-[0.98]"
                  >
                    Complete Ride
                  </button>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
                    <Link
                      to={`/edit-ride/${ride.id}`}
                      className="px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center"
                    >
                      Edit Ride
                    </Link>

                    <button
                      onClick={handleStartRide}
                      className="px-6 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all active:scale-[0.98]"
                    >
                      Start Ride
                    </button>

                    <button
                      onClick={async () => {
                        const confirmed = window.confirm(
                          "Are you sure you want to cancel this ride?",
                        );

                        if (!confirmed) return;

                        try {
                          const response = await authFetch(
                            `${API_URL}/rides/${ride.id}/cancel`,
                            token,
                            {
                              method: "PUT",
                            },
                          );

                          const data = await response.json();

                          if (!response.ok) {
                            alert(data.message || "Failed to cancel ride.");
                            return;
                          }

                          const cancellationTime =
                            data?.ride?.cancelled_at ||
                            data?.ride?.cancelledAt ||
                            new Date().toISOString();

                          const chatAvailableUntil =
                            new Date(cancellationTime).getTime() +
                            10 * 60 * 1000;

                          setRide((previousRide) => ({
                            ...previousRide,
                            status: "Cancelled",
                            cancelledAt: cancellationTime,
                          }));

                          updateRideInState(ride.id, {
                            status: "Cancelled",
                          });

                          // Ride is cancelled, so clear the confirmed
                          // passenger list immediately. They will remain
                          // only in the chat-grace list for 10 minutes.
                          setPassengers([]);

                          // Preserve chat access for passengers for the
                          // 10-minute grace period.
                          setChatGracePassengers(
                            passengers.map((passenger) => ({
                              ...passenger,
                              chatAvailableUntil,
                              reason: "Ride cancelled",
                            })),
                          );

                          alert(data.message);
                        } catch (error) {
                          console.error("Error cancelling ride:", error);
                          alert("Unable to connect to server.");
                        }
                      }}
                      className="px-6 py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all active:scale-[0.98]"
                    >
                      Cancel Ride
                    </button>
                  </div>
                )
              ) : alreadyJoined || booking ? (
                ride.status === "In Progress" ? (
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button
                      onClick={() =>
                        navigate(`/chat/${ride.id}?receiver=${ride.driver.id}`)
                      }
                      className="px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={20} />
                      Chat with Driver
                    </button>

                    <div className="px-6 py-4 bg-blue-100 text-blue-700 rounded-lg font-semibold flex items-center justify-center">
                      Ride in progress
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button
                      onClick={() =>
                        navigate(`/chat/${ride.id}?receiver=${ride.driver.id}`)
                      }
                      className="px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={20} />
                      Chat with Driver
                    </button>

                    <button
                      onClick={handleLeaveRide}
                      className="px-6 py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all active:scale-[0.98]"
                    >
                      Leave Ride
                    </button>
                  </div>
                )
              ) : ride.status === "In Progress" ? (
                <div className="text-center text-amber-500 py-3">
                  Ride already started
                </div>
              ) : gracePeriodEnded ? (
                <div className="text-center text-slate-500 py-3">
                  Ride Departed
                </div>
              ) : (
                <button
                  onClick={handleJoinRide}
                  disabled={tripSeats <= 0}
                  className="px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {tripSeats > 0 ? "Join Ride" : "No Seats Available"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default RideDetails;

{
  /* <nav className="glass-crystal backdrop-blur-md sticky top-0 z-20 rounded-none border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex flex-col items-center text-center">
            <span className="text-2xl font-bold text-blue-600 font-display">
              Ride<span className="text-green-600">Sync</span>
            </span>

            <span className="text-xs font-medium text-slate-600">
              Sync your ride, with RideSync.
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="text-slate-600 hover:text-blue-600"
            >
              Dashboard
            </Link>

            <Link to="/my-rides" className="text-slate-600 hover:text-blue-600">
              My Rides
            </Link>

            <UserMenu />
          </div>
        </div>
      </nav> */
}
