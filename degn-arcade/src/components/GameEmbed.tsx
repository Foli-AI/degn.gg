"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";

type GameEmbedProps = {
  src: string;          // URL to client html: /games/sol-bird/client/index.html?lobby=...
  width?: string;
  height?: string;
  allowFullScreen?: boolean;
  useIframe?: boolean;  // fallback: if repo previously injected scripts, useIframe=false path
};

function GameEmbed({ 
  src, 
  width = "100%", 
  height = "100%", 
  allowFullScreen = true, 
  useIframe = true 
}: GameEmbedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const mountedRef = useRef(false);
  
  // Extract game name from src to create stable key (only remount if game changes)
  const gameName = useMemo(() => {
    const match = src.match(/\/games\/([^\/]+)\//);
    return match ? match[1] : 'unknown';
  }, [src]);
  
  // Stable iframe key based on game name only
  const iframeKey = useMemo(() => `game-iframe-${gameName}`, [gameName]);

  // Message listener for GAME_READY
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from any origin for development (restrict in production)
      if (event.data?.type === "GAME_READY") {
        console.info("[GameEmbed] GAME_READY received from iframe");
        setIsLoaded(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Mount iframe only once
  useEffect(() => {
    if (mountedRef.current) {
      console.info("[GameEmbed] Already mounted, skipping");
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    console.info("[GameEmbed] Mounting iframe", { src, gameName, iframeKey });

    if (useIframe) {
      // Check if iframe already exists
      const existing = container.querySelector(`iframe[data-game-key="${iframeKey}"]`) as HTMLIFrameElement;
      if (existing) {
        console.info("[GameEmbed] Iframe already exists, reusing");
        iframeRef.current = existing;
        setIsMounted(true);
        mountedRef.current = true;
        return;
      }

      const iframe = document.createElement("iframe");
      iframe.setAttribute("data-game-key", iframeKey);
      iframeRef.current = iframe;
      iframe.src = src;
      iframe.width = width;
      iframe.height = height;
      iframe.setAttribute("allow", "autoplay; fullscreen");
      iframe.style.border = "0";
      iframe.style.borderRadius = "10px";
      iframe.style.opacity = isLoaded ? "1" : "0";
      iframe.style.transition = "opacity 0.3s";
      if (allowFullScreen) iframe.setAttribute("allowFullScreen", "true");

      // Don't unmount on slow load - just wait
      iframe.onload = () => {
        console.info("[GameEmbed] Iframe loaded, waiting for GAME_READY...");
        // Don't set loaded here - wait for postMessage
      };

      container.appendChild(iframe);
      setIsMounted(true);
      mountedRef.current = true;

      // Cleanup only on unmount (not on src change)
      return () => {
        console.info("[GameEmbed] Component unmounting");
        mountedRef.current = false;
        // Only remove if container still exists and iframe is still a child
        if (container && iframe.parentNode === container) {
          try {
            container.removeChild(iframe);
          } catch (err) {
            try {
              iframe.remove?.();
            } catch (_) {
              // Swallow error
            }
          }
        }
        iframeRef.current = null;
      };
    }
    // Only depend on gameName - don't remount on src changes (query params)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameName, useIframe]);

  // Update src if it changes (without remounting)
  useEffect(() => {
    if (iframeRef.current && isMounted) {
      const currentSrc = iframeRef.current.src;
      // Compare without protocol/host for same-origin
      const currentPath = currentSrc.split(window.location.origin)[1] || currentSrc;
      const newPath = src.startsWith('http') ? src.split(window.location.origin)[1] || src : src;
      
      if (currentPath !== newPath) {
        console.info("[GameEmbed] Updating iframe src without remounting", { old: currentPath, new: newPath });
        iframeRef.current.src = src;
        // Reset loaded state when src changes
        setIsLoaded(false);
      }
    }
  }, [src, isMounted]);

  // Update opacity when loaded state changes
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.style.opacity = isLoaded ? "1" : "0";
    }
  }, [isLoaded]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      {!isLoaded && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "white",
          fontSize: "18px"
        }}>
          Loading game...
        </div>
      )}
    </div>
  );
}

// Prevent Fast Refresh remount
export default React.memo(GameEmbed);
