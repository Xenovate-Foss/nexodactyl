import Turnstile, { useTurnstile } from "react-turnstile";
import { config } from "./api";
import { useState, useEffect } from "react";

function TurnstileWidget({ onVerify }) {
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
        console.error('Failed to fetch site key:', err);
        setError('Failed to load verification widget');
      } finally {
        setLoading(false);
      }
    };
    
    setKey(); // Actually call the function
  }, []);

  if (loading) {
    return <div>Loading verification...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!siteKey) {
    return <div>No site key available</div>;
  }

  return <Turnstile sitekey={siteKey} onVerify={onVerify} />;
}

export default TurnstileWidget;