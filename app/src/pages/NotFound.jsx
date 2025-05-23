import React, { useState, useEffect } from "react";

export default function NotFoundPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Trigger glitch effect periodically
    const glitchInterval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 3000);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(glitchInterval);
    };
  }, []);

  const FloatingParticle = ({ delay, size, duration, left, top }) => (
    <div
      className={`absolute opacity-60 animate-bounce`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    >
      <div
        className={`bg-blue-400 rounded-full blur-sm ${size}`}
        style={{
          boxShadow: "0 0 20px rgba(59, 130, 246, 0.8)",
        }}
      />
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-black relative overflow-hidden flex items-center justify-center">
      {/* Gradient Background */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background:
            "linear-gradient(135deg, #000000 0%, #1f2937 30%, #1e3a8a 70%, #1e40af 100%)",
        }}
      />

      {/* Animated Background Elements */}
      <div className="absolute inset-0 w-full h-full">
        {/* Large Gradient Orbs */}
        <div
          className="absolute w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full opacity-20 animate-pulse"
          style={{
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)",
            left: `${20 + mousePosition.x * 0.01}%`,
            top: `${20 + mousePosition.y * 0.01}%`,
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute top-1/4 right-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-full opacity-15 animate-bounce"
          style={{
            background:
              "radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-40 h-40 sm:w-56 sm:h-56 md:w-72 md:h-72 rounded-full opacity-25"
          style={{
            background:
              "radial-gradient(circle, rgba(30, 58, 138, 0.4) 0%, transparent 70%)",
            filter: "blur(35px)",
          }}
        />

        {/* Floating Particles */}
        <FloatingParticle
          delay={0}
          size="w-2 h-2"
          duration={3}
          left={10}
          top={20}
        />
        <FloatingParticle
          delay={0.5}
          size="w-1 h-1"
          duration={4}
          left={80}
          top={30}
        />
        <FloatingParticle
          delay={1}
          size="w-2 h-2"
          duration={3.5}
          left={15}
          top={70}
        />
        <FloatingParticle
          delay={1.5}
          size="w-1 h-1"
          duration={5}
          left={90}
          top={60}
        />
        <FloatingParticle
          delay={2}
          size="w-2 h-2"
          duration={3}
          left={50}
          top={15}
        />
        <FloatingParticle
          delay={2.5}
          size="w-1 h-1"
          duration={4.5}
          left={25}
          top={85}
        />
        <FloatingParticle
          delay={3}
          size="w-2 h-2"
          duration={3.5}
          left={75}
          top={80}
        />
        <FloatingParticle
          delay={3.5}
          size="w-1 h-1"
          duration={4}
          left={60}
          top={90}
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 md:px-8 w-full max-w-6xl mx-auto">
        {/* 404 Number */}
        <div className="relative mb-6 sm:mb-8">
          <h1
            className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black leading-none select-none transform transition-all duration-200 ${
              glitchActive ? "animate-pulse scale-105" : ""
            }`}
            style={{
              background: "linear-gradient(45deg, #3b82f6, #06b6d4, #2563eb)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 40px rgba(59, 130, 246, 0.8)",
              filter: glitchActive
                ? "hue-rotate(180deg) brightness(1.2)"
                : "none",
            }}
          >
            404
          </h1>

          {/* Glitch Layers */}
          {glitchActive && (
            <>
              <h1 className="absolute top-0 left-0 text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-red-500 leading-none opacity-30 select-none transform translate-x-1 -translate-y-1">
                404
              </h1>
              <h1 className="absolute top-0 left-0 text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-cyan-400 leading-none opacity-30 select-none transform -translate-x-1 translate-y-1">
                404
              </h1>
            </>
          )}
        </div>

        {/* Main Message Card */}
        <div
          className="backdrop-blur-sm rounded-2xl p-4 sm:p-6 md:p-8 border shadow-2xl mb-6 sm:mb-8 mx-auto max-w-4xl"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderColor: "rgba(59, 130, 246, 0.2)",
          }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 tracking-wide">
            Page Not Found
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-4 sm:mb-6 leading-relaxed px-2">
            The page you're looking for has drifted into the digital void.
            <br className="hidden sm:block" />
            Don't worry, even the best explorers get lost sometimes.
          </p>

          {/* Error Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 text-sm">
            <div
              className="rounded-lg p-3 sm:p-4 border"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                borderColor: "rgba(59, 130, 246, 0.3)",
              }}
            >
              <div className="text-blue-400 font-semibold">Error Code</div>
              <div className="text-white">404</div>
            </div>
            <div
              className="rounded-lg p-3 sm:p-4 border"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                borderColor: "rgba(59, 130, 246, 0.3)",
              }}
            >
              <div className="text-blue-400 font-semibold">Status</div>
              <div className="text-white">Not Found</div>
            </div>
            <div
              className="rounded-lg p-3 sm:p-4 border"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                borderColor: "rgba(59, 130, 246, 0.3)",
              }}
            >
              <div className="text-blue-400 font-semibold">Type</div>
              <div className="text-white">Client Error</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12">
          <button
            className="w-full sm:w-auto group relative px-6 sm:px-8 py-3 sm:py-4 rounded-full text-white font-semibold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
            style={{
              background: "linear-gradient(45deg, #2563eb, #06b6d4)",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = "0 8px 25px rgba(59, 130, 246, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = "0 4px 15px rgba(59, 130, 246, 0.3)";
            }}
            onClick={() => window.history.back()}
          >
            Go Back
          </button>

          <button
            className="w-full sm:w-auto group relative px-6 sm:px-8 py-3 sm:py-4 border-2 border-blue-500 rounded-full text-blue-400 font-semibold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 hover:bg-blue-500 hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/50"
            onClick={() => (window.location.href = "/")}
          >
            Home Page
          </button>
        </div>

        {/* Additional Info */}
        <div className="text-gray-400 text-xs sm:text-sm px-4">
          <p>
            Lost? Try checking the URL or contact support if you believe this is
            an error.
          </p>
        </div>
      </div>

      {/* Corner Decorations */}
      <div className="absolute top-4 sm:top-8 left-4 sm:left-8 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-l-2 border-t-2 border-blue-500 opacity-60" />
      <div className="absolute top-4 sm:top-8 right-4 sm:right-8 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-r-2 border-t-2 border-blue-500 opacity-60" />
      <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-l-2 border-b-2 border-blue-500 opacity-60" />
      <div className="absolute bottom-4 sm:bottom-8 right-4 sm:right-8 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 border-r-2 border-b-2 border-blue-500 opacity-60" />
    </div>
  );
}
