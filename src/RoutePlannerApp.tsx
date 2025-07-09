import React, { useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import { v4 as uuidv4 } from "uuid";

interface Stop {
  id: string;
  address: string;
  lat?: number;
  lon?: number;
  checked: boolean;
  eta?: string;
}

export default function RoutePlannerApp() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [delayPerStop, setDelayPerStop] = useState<number>(0);
  const [polylineCoords, setPolylineCoords] = useState<[number, number][]>([]);

  const geocodeAddress = async (address: string) => {
    const response = await fetch(
      \`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(address)}\`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    return null;
  };

  const addStop = async () => {
    if (newAddress.trim() === "") return;
    const coords = await geocodeAddress(newAddress);
    if (coords) {
      setStops([
        ...stops,
        {
          id: uuidv4(),
          address: newAddress,
          lat: coords.lat,
          lon: coords.lon,
          checked: false,
        },
      ]);
      setNewAddress("");
    } else {
      alert("Could not geocode address.");
    }
  };

  const optimizeRoute = async () => {
    const coords = stops
      .map((s) => (s.lat && s.lon ? \`\${s.lon},\${s.lat}\` : null))
      .filter(Boolean)
      .join(";");
    const response = await fetch(
      \`https://router.project-osrm.org/trip/v1/driving/\${coords}?source=first&roundtrip=false&overview=full\`
    );
    const data = await response.json();
    if (data.code === "Ok") {
      const newOrder = data.waypoints.map((wp) => wp.waypoint_index);
      const reordered = newOrder.map((idx) => stops[idx]);

      let time = new Date();
      const updated = reordered.map((s) => {
        const eta = new Date(time.getTime());
        time.setMinutes(time.getMinutes() + delayPerStop);
        return { ...s, eta: eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      });

      setStops(updated);
      const coordsArray = data.trips[0].geometry.coordinates.map(
        ([lon, lat]: [number, number]) => [lat, lon]
      );
      setPolylineCoords(coordsArray);
    } else {
      alert("Route optimization failed.");
    }
  };

  const getGoogleMapsLink = (address: string) =>
    \`https://www.google.com/maps/dir/?api=1&destination=\${encodeURIComponent(address)}&travelmode=driving\`;

  return (
    <div>
      <h1>Route Planner</h1>
      <input
        value={newAddress}
        onChange={(e) => setNewAddress(e.target.value)}
        placeholder="Enter address"
      />
      <button onClick={addStop}>Add Stop</button>
      <button onClick={optimizeRoute}>Optimize Route</button>
      <label>
        Delay per stop (min):
        <input
          type="number"
          min={0}
          max={30}
          value={delayPerStop}
          onChange={(e) => setDelayPerStop(parseInt(e.target.value))}
        />
      </label>
      <ul>
        {stops.map((s) => (
          <li key={s.id}>
            <a href={getGoogleMapsLink(s.address)} target="_blank" rel="noopener noreferrer">
              {s.address}
            </a>{" "}
            {s.eta ? `(ETA: ${s.eta})` : ""} +{delayPerStop} min
          </li>
        ))}
      </ul>
      <MapContainer center={[49.25, -123.1]} zoom={11} style={{ height: "400px", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {polylineCoords.length > 0 && <Polyline positions={polylineCoords} color="blue" />}
        {stops.map((s) =>
          s.lat && s.lon ? (
            <Marker key={s.id} position={[s.lat, s.lon]}>
              <Popup>{s.address}</Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>
    </div>
  );
}
