/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { generateWatercolourPainting } from './geminiService';
import { Loader } from '@googlemaps/js-api-loader';

const GOOGLE_MAPS_API_KEY = "AIzaSyDzmSHds_56_oeLYEbXpfgGSzkX_502axI";

const loader = new Loader({
    apiKey: GOOGLE_MAPS_API_KEY,
    version: "beta",
    libraries: ["places", "marker", "geocoding"],
});

const placeholders = [
    "法國巴黎艾菲爾鐵塔",
    "您的家鄉",
    "英國倫敦白金漢宮",
    "你們初次相遇的地方",
    "美國紐約自由女神像",
    "台北 101 大樓",
    "日本京都清水寺"
];

const App: React.FC = () => {
    const [address, setAddress] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [mapInitialized, setMapInitialized] = useState<boolean>(false);
    const [isGeneratingPainting, setIsGeneratingPainting] = useState<boolean>(false);
    const [watercolourPainting, setWatercolourPainting] = useState<string>('');
    const [capturedMapImage, setCapturedMapImage] = useState<string>('');
    const [placeholder, setPlaceholder] = useState<string>(placeholders[0]);

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markerInstanceRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const autocompleteRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setPlaceholder(currentPlaceholder => {
                const currentIndex = placeholders.indexOf(currentPlaceholder);
                const nextIndex = (currentIndex + 1) % placeholders.length;
                return placeholders[nextIndex];
            });
        }, 3000); // Change placeholder every 3 seconds

        return () => clearInterval(intervalId);
    }, []);

    const initMap = useCallback(async (location: google.maps.LatLngLiteral, formattedAddr: string) => {
        if (!mapRef.current) return;

        // Cast loader to any to avoid TypeScript errors as importLibrary might be missing in type definitions
        const { Map } = await (loader as any).importLibrary('maps');
        const { AdvancedMarkerElement } = await (loader as any).importLibrary('marker');

        const mapOptions: google.maps.MapOptions = {
            center: location,
            zoom: 20,
            mapId: 'DEMO_MAP_ID',
            mapTypeId: 'satellite',
            tilt: 67.5,
            heading: 0,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            zoomControl: true,
        };

        if (!mapInstanceRef.current) {
            mapInstanceRef.current = new Map(mapRef.current, mapOptions);
        } else {
            mapInstanceRef.current.setOptions(mapOptions);
        }

        if (!markerInstanceRef.current) {
            const markerElement = document.createElement('div');
            markerElement.innerHTML = ``;
            
            markerInstanceRef.current = new AdvancedMarkerElement({
                position: location,
                map: null,
                title: formattedAddr,
                content: markerElement,
            });
        } else {
            markerInstanceRef.current.position = location;
            markerInstanceRef.current.title = formattedAddr;
            markerInstanceRef.current.map = mapInstanceRef.current;
        }



        setMapInitialized(true);
        setWatercolourPainting('');
        setCapturedMapImage('');
    }, []);

    useEffect(() => {
        let autocomplete: google.maps.places.Autocomplete;
        let listener: google.maps.MapsEventListener;

        // Cast loader to any to avoid TypeScript errors with missing method definitions
        (loader as any).load().then(() => {
            if (autocompleteRef.current) {
                autocomplete = new google.maps.places.Autocomplete(autocompleteRef.current, {
                    types: ['address'],
                });

                listener = autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (place.geometry?.location && place.formatted_address) {
                        setAddress(place.formatted_address);
                        initMap(place.geometry.location.toJSON(), place.formatted_address);
                    }
                });
            }
        });

        return () => {
            if (listener) {
                listener.remove();
            }
        };
    }, [initMap]);



    const captureMapView = useCallback(async (): Promise<string> => {
        if (!mapInstanceRef.current) {
            throw new Error("地圖尚未初始化。");
        }
        const map = mapInstanceRef.current;
        
        // Capture satellite view using html2canvas
        const mapDiv = map.getDiv();
        const canvas = await html2canvas(mapDiv, { useCORS: true, allowTaint: true });
        return canvas.toDataURL('image/png');
    }, []);

    const handleShow3DView = async () => {
        setError(null);
        if (!address.trim()) {
            setError("請輸入地址。");
            return;
        }

        setIsLoading(true);
        try {
            // Cast loader to any to avoid TypeScript errors with missing method definitions
            const { Geocoder } = await (loader as any).importLibrary('geocoding');
            const geocoder = new Geocoder();
            const { results } = await geocoder.geocode({ address });

            if (results && results[0]) {
                const location = results[0].geometry.location;
                const formattedAddr = results[0].formatted_address;
                setAddress(formattedAddr); // Update the address state with the formatted one
                initMap(location.toJSON(), formattedAddr);
            } else {
                // Set a more user-friendly error
                setError(`找不到 "${address}" 的位置。請嘗試更具體的地址或從清單中選擇。`);
            }
        } catch (err) {
            if (err instanceof Error && err.message.includes('ZERO_RESULTS')) {
                setError(`找不到 "${address}" 的位置。請檢查地址後重試。`);
            } else {
                setError(err instanceof Error ? err.message : "發生未知錯誤。");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateWatercolour = async () => {
        const isRerunning = !!watercolourPainting;
    
        setIsGeneratingPainting(true);
        setError(null);
    
        try {
            let imageToProcess: string;
    
            if (isRerunning && capturedMapImage) {
                // Re-running with the cached image
                imageToProcess = capturedMapImage;
            } else {
                // First run, or run from map view: capture a new image
                const newImageDataUrl = await captureMapView();
                setCapturedMapImage(newImageDataUrl); // Cache the image
                imageToProcess = newImageDataUrl;
            }
    
            const paintingDataUrl = await generateWatercolourPainting(imageToProcess);
            setWatercolourPainting(paintingDataUrl); // This overwrites the old one if it exists
        } catch (err) {
            setError(err instanceof Error ? err.message : "生成水彩畫失敗。");
            // On error, clear everything to go back to the map state.
            setWatercolourPainting('');
            setCapturedMapImage('');
        } finally {
            setIsGeneratingPainting(false);
        }
    };
    
    const handleBackToMap = () => {
        setWatercolourPainting('');
        setCapturedMapImage('');
    };

    const handleDownloadPainting = () => {
        if (!watercolourPainting) return;
        const link = document.createElement('a');
        link.href = watercolourPainting;
        // Use a generic name if address has special chars, but try to use address if safe
        const safeAddress = address.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_'); 
        link.download = `水彩畫_${safeAddress || 'painting'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl font-sans">
            <style>{`.pac-container { z-index: 1050 !important; }`}</style>
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <header>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">景點繪畫師</h1>
                    <p className="text-gray-600 mb-6">輸入您最喜歡的地點地址，將衛星影像變成美麗的水彩畫。</p>
                </header>

                <div className="mb-4">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">完整地址</label>
                    <div className="relative">
                        <input
                            ref={autocompleteRef}
                            type="text"
                            id="address"
                            onChange={(e) => setAddress(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleShow3DView();
                                }
                            }}
                            disabled={isLoading}
                            className="w-full pl-4 pr-12 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900"
                            placeholder={placeholder}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleShow3DView}
                                    disabled={isLoading}
                                    className="p-1 text-gray-500 rounded-full hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    aria-label="搜尋"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 mb-4">
                    {mapInitialized && (
                        <button
                            onClick={handleGenerateWatercolour}
                            disabled={isGeneratingPainting}
                            className="flex-grow bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105 shadow-md disabled:bg-green-400 disabled:cursor-not-allowed flex items-center justify-center h-12 whitespace-nowrap"
                        >
                            {isGeneratingPainting ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                watercolourPainting ? '🎨 重新製作水彩畫' : '🎨 製作水彩畫'
                            )}
                        </button>
                    )}
                     {watercolourPainting && !isGeneratingPainting && (
                        <button
                            onClick={handleBackToMap}
                            className="flex-grow bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-transform transform hover:scale-105 shadow-md flex items-center justify-center h-12 whitespace-nowrap"
                        >
                            🗺️ 返回地圖
                        </button>
                    )}
                </div>

                {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-center" role="alert">{error}</div>}
                
                <div className="bg-gray-50 rounded-2xl h-[70vh] shadow-inner overflow-hidden relative">
                    <div ref={mapRef} className={`w-full h-full rounded-2xl transition-opacity duration-300 ${mapInitialized && !watercolourPainting && !isGeneratingPainting ? 'opacity-100' : 'opacity-0'}`} />

                    {!mapInitialized && (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-200 rounded-2xl">
                            <p className="text-gray-500 text-center px-4">提交地址後，地圖將顯示在此處。</p>
                        </div>
                    )}
                    
                    {isGeneratingPainting && (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-800 bg-opacity-75 rounded-2xl z-10 transition-opacity duration-300">
                            <div className="text-center text-white p-4">
                                <svg className="animate-spin h-10 w-10 text-white mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <h3 className="text-xl font-semibold">正在創作您的傑作...</h3>
                                <p className="mt-2 text-gray-300">AI 正在準備畫筆，這可能需要一點時間。</p>
                            </div>
                        </div>
                    )}

                    {watercolourPainting && !isGeneratingPainting && (
                        <div className="absolute inset-0 w-full h-full flex flex-col bg-white rounded-2xl z-10 transition-opacity duration-300">
                            <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">已生成水彩畫</h3>
                                    <p className="text-sm text-gray-600">由 AI 根據您的 3D 衛星視圖生成</p>
                                </div>
                                <button
                                    onClick={handleDownloadPainting}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-md"
                                    aria-label="下載畫作"
                                    title="下載畫作"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    下載
                                </button>
                            </div>
                            <div className="flex flex-col flex-row text-center items-center justify-center p-4 bg-gray-50 min-h-0">
                                <img 
                                    src={watercolourPainting} 
                                    alt="Watercolor painting of the building"
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                                />
                            </div>
                        </div>
                    )}
                </div>
                <p className="text-gray-500 mt-4 text-center">
                    盡量縮放和傾斜視角！數據越清晰，畫作越漂亮 🥹
                </p>
                <p className="text-gray-500 text-center">
                    畫作是建築物的藝術詮釋，可能不會完全準確。
                </p>
                <p className="text-gray-500 text-center">
                    但它們絕對很美！
                </p>
                
            </div>
            <footer className="text-gray-500 mt-6 text-center text-sm">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-neutral-500">
                    <p className="whitespace-nowrap">由 Gemini 2.5 Flash Image Preview 提供技術支援</p>
                    <span className="hidden md:inline text-neutral-700" aria-hidden="true">|</span>
                    <p>
                        作者：{' '}
                        <a
                            href="https://x.com/leslienooteboom"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-yellow-400 transition-colors duration-200"
                        >
                            @leslienooteboom
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default App;