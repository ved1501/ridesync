import { createContext, useContext } from "react";

export const RideContext = createContext();

export function useRide() {
  return useContext(RideContext);
}