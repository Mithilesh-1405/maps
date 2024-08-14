import React, { useEffect, useRef, useState } from "react";
import "../App.css";
import L from "leaflet";
import car from "../../src/images/car.png";
import { v4 as uuidv4 } from "uuid";
import polyline from "polyline";
const apiKey = "OrCH8o2aDx0mJkv0PzgSLiPMzMAgNqyhblmHWFSa";

const MapComponent = () => {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const polylineRef = useRef(null);
    const [polylineString, setString] = useState("");
    const [latlngs, setDecodedPolyline] = useState([]);
    const [inputValues, setInputValues] = useState({});
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState(
        ""
    );
    const [startLat, setStartLat] = useState();
    const [startLng, setStartLng] = useState();
    const handleChange = (e) => {
        const { name, value } = e.target;
        setInputValues({
            ...inputValues,
            [name]: value,
        });
    };
    const handleSearch = () => {
        setOrigin(inputValues.origin);
        setDestination(inputValues.destination);
        console.log(origin, destination);
        geocodeLocation(origin, apiKey, uuidv4());
    };
    const geocodeLocation = async (location, apiKey, requestId) => {

        const bounds = '12.910000,77.610000|12.900000,77.600000';
        const language = 'hi';

        const url = `https://api.olamaps.io/places/v1/geocode?address=${location}&language=${language}&api_key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Request-Id': requestId,
                },
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            console.log(data.geocodingResults[0].geometry.location.lat)
            return data;
        } catch (error) {
            console.error('Failed to fetch geocode data:', error);
        }
    }


    const fetchRoute = async () => {
        const requestId = uuidv4();

        const response = await fetch(
            `https://api.olamaps.io/routing/v1/directions?origin=${origin}&destination=${destination}&api_key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "X-Request-Id": requestId,
                },
            }
        );
        if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes[0]) {
                setString(data.routes[0].overview_polyline);
                setDecodedPolyline(polyline.decode(polylineString));
            }
        } else {
            console.error(
                "Failed to fetch route:",
                response.status,
                response.statusText
            );
        }
    };

    useEffect(() => {
        fetchRoute();
    }, []);

    useEffect(() => {
        if (latlngs.length === 0) return;

        const carIcon = L.icon({
            iconUrl: car,
            iconSize: [55, 50],
            iconAnchor: [25, 20],
            popupAnchor: [-3, -76],
        });

        if (!mapRef.current) {
            mapRef.current = L.map("map").setView(latlngs[0], 15);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapRef.current);

            markerRef.current = L.marker(latlngs[0], { icon: carIcon }).addTo(
                mapRef.current
            );

            polylineRef.current = L.polyline([latlngs[0]], { color: "blue" }).addTo(
                mapRef.current
            );
        }

        let index = 0;
        const moveMarker = () => {
            if (index < latlngs.length - 1) {
                index++;
                const nextLatLng = latlngs[index];
                markerRef.current.setLatLng(nextLatLng);
                polylineRef.current.addLatLng(nextLatLng);
                mapRef.current.panTo(nextLatLng);
            }
        };

        const interval = setInterval(moveMarker, 50);

        return () => {
            clearInterval(interval);
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [latlngs]);

    return (
        <div>
            <div id="map" style={{ height: "100vh", width: "100%", zIndex: 0 }}></div>
            <div className="inputParams">
                <input
                    type="text"
                    name="origin"
                    placeholder="Origin"
                    autoComplete="off"
                    onChange={handleChange}
                />
                <input
                    type="text"
                    name="destination"
                    autoComplete="off"
                    placeholder=" Destination"
                    onChange={handleChange}
                />
                <button onClick={handleSearch}>Search</button>
            </div>
        </div>
    );
};

export default MapComponent;
