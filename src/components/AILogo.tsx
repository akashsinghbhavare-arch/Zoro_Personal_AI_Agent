import { motion } from 'framer-motion';

export const AILogo = () => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-lg cursor-pointer relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-blue-400 opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
      <span className="text-white font-bold text-lg relative z-10">AI</span>
      <div className="absolute inset-0 shadow-[0_0_15px_rgba(139,92,246,0.5)] group-hover:shadow-[0_0_25px_rgba(139,92,246,0.7)] transition-shadow duration-300" />
    </motion.div>
  );
};
