/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


// This file provides TypeScript definitions for the Google Maps JavaScript API.
// By declaring the 'google' namespace globally, we can use strong types for maps,
// markers, geocoding, and places autocomplete throughout the application without
// causing TypeScript compilation errors.


declare global {
  namespace google {
    namespace maps {
      // Basic LatLng interfaces
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }
      class LatLng {
        constructor(lat: number, lng: number);
        lat(): number;
        lng(): number;
        toJSON(): LatLngLiteral;
      }

      // Event Listener interface for cleanup
      interface MapsEventListener {
        remove(): void;
      }

      // Map class
      class Map {
        constructor(mapDiv: HTMLElement, opts?: MapOptions);
        setOptions(options: MapOptions): void;
        setCenter(latLng: LatLng | LatLngLiteral): void;
        setZoom(zoom: number): void;
        getDiv(): HTMLDivElement;
      }

      // Map options
      interface MapOptions {
        center?: LatLng | LatLngLiteral;
        zoom?: number;
        mapTypeId?: string | MapTypeId;
        tilt?: number;
        heading?: number;
        streetViewControl?: boolean;
        mapTypeControl?: boolean;
        fullscreenControl?: boolean;
        zoomControl?: boolean;
        mapId?: string;
      }
      
      enum MapTypeId {
        HYBRID = 'hybrid',
        ROADMAP = 'roadmap',
        SATELLITE = 'satellite',
        TERRAIN = 'terrain',
      }
      
      // Modern Advanced Marker Element (recommended replacement for Marker)
      namespace marker {
        class AdvancedMarkerElement extends HTMLElement {
          constructor(opts?: AdvancedMarkerElementOptions);
          position?: LatLng | LatLngLiteral;
          title: string;
          map?: Map;
        }

        interface AdvancedMarkerElementOptions {
          position: LatLng | LatLngLiteral;
          map?: Map;
          title?: string;
          content?: HTMLElement;
        }
      }
      
      // Legacy Marker class (deprecated - kept for reference)
      /** @deprecated Use google.maps.marker.AdvancedMarkerElement instead */
      class Marker {
        constructor(opts?: MarkerOptions);
        setPosition(position: LatLng | LatLngLiteral | null): void;
        setTitle(title: string | null): void;
        setMap(map: Map | null): void;
        setAnimation(animation: Animation | null): void;
      }

      interface MarkerOptions {
          position: LatLng | LatLngLiteral;
          map?: Map;
          title?: string;
          animation?: Animation;
      }

      enum Animation {
        BOUNCE = 1,
        DROP = 2,
      }

      // Modern Places Autocomplete Element (recommended replacement for Autocomplete)
      namespace places {
        class PlaceAutocompleteElement extends HTMLElement {
          constructor();
          addListener(eventName: 'place_changed', handler: () => void): MapsEventListener;
          getPlace(): PlaceResult;
          setAttribute(name: string, value: string): void;
          addEventListener(type: string, listener: EventListener): void;
          style: CSSStyleDeclaration;
        }

        // Legacy Autocomplete class (deprecated - kept for reference)
        /** @deprecated Use google.maps.places.PlaceAutocompleteElement instead */
        class Autocomplete {
          constructor(inputElement: HTMLInputElement, opts?: AutocompleteOptions);
          addListener(eventName: 'place_changed', handler: () => void): MapsEventListener;
          getPlace(): PlaceResult;
        }

        interface AutocompleteOptions {
          types?: string[];
        }

        interface PlaceResult {
            formatted_address?: string;
            geometry?: {
                location: LatLng;
            };
        }
      }

      // Geocoder
      class Geocoder {
        geocode(
          request: GeocoderRequest
        ): Promise<{ results: GeocoderResult[] }>;
      }

      interface GeocoderRequest {
          address: string;
      }

      interface GeocoderResult {
        geometry: {
          location: LatLng;
        };
        formatted_address: string;
      }

      enum GeocoderStatus {
        OK = 'OK',
        ZERO_RESULTS = 'ZERO_RESULTS',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        REQUEST_DENIED = 'REQUEST_DENIED',
        INVALID_REQUEST = 'INVALID_REQUEST',
        UNKNOWN_ERROR = 'UNKNOWN_ERROR',
      }
    }
  }
}

export {};