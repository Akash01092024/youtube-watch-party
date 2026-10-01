let apiPromise;

export function loadYouTubeAPI() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        resolve(window.YT);
      };

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;

      script.onerror = () => {
        apiPromise = null;
        script.remove();
        reject(new Error("Could not load the YouTube player."));
      };

      document.head.appendChild(script);
    });
  }

  return apiPromise;
}