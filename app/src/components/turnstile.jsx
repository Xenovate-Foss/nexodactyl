import Turnstile, { useTurnstile } from "react-turnstile";
import { config } from "./api";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

function TurnstileWidget({ onComplete, className }) {
  const turnstile = useTurnstile();
  const [siteKey, setSiteKey] = useState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const setKey = async () => {
      try {
        setLoading(true);
        setError(null);
        const { site_key } = await config();
        setSiteKey(site_key);
      } catch (err) {
        console.error("Failed to fetch site key:", err);
        setError("Failed to load verification widget");
      } finally {
        setLoading(false);
      }
    };

    setKey();
  }, []);

  const onVerify = useCallback(
    async (token) => {
      try {
        const response = await axios.post("/api/verify-turnstile", {
          token,
        });

        // Check response.data.success instead of response.success
        if (response.data.success) {
          onComplete(true);
        } else {
          onComplete(false);
        }
      } catch (error) {
        console.error("Verification failed:", error);
        onComplete(false);
      }
    },
    [onComplete]
  ); // Include onComplete in dependencies

  // Handle verification errors
  const onError = useCallback(() => {
    console.error("Turnstile verification error");
    onComplete(false);
  }, [onComplete]);

  if (loading) {
    return <div>Loading verification...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!siteKey) {
    return <div>No site key available</div>;
  }

  return (
    <Turnstile
      sitekey={siteKey}
      onVerify={onVerify}
      onError={onError}
      className={className}
    />
  );
}

export default TurnstileWidget;
