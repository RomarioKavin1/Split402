"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function LandingPage() {
  const router = useRouter();

  const handleLaunchDapp = () => {
    router.push("/app");
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center space-y-8"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          className="space-y-4"
        >
          <h1 className="text-7xl font-bold tracking-tight">
            <span className="text-blue-400">split</span>
            <span className="text-white">402</span>
          </h1>
          <p className="text-gray-400 text-xl font-light">
            Split bills with friends using web3
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <button
            onClick={handleLaunchDapp}
            className="px-8 py-4 bg-blue-600 text-white rounded-full text-lg font-medium hover:bg-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Launch Dapp
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
