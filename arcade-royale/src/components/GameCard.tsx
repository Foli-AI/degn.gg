'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Users, Trophy, Zap } from 'lucide-react';

export interface GameCardProps {
  id: string;
  title: string;
  description: string;
  players: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rewards: string;
  status: 'Live' | 'Coming Soon' | 'Beta';
  image?: string;
}

export const GameCard: React.FC<GameCardProps> = ({
  id,
  title,
  description,
  players,
  difficulty,
  rewards,
  status,
  image
}) => {
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy': return 'text-green-400';
      case 'Medium': return 'text-yellow-400';
      case 'Hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (stat: string) => {
    switch (stat) {
      case 'Live': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Beta': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Coming Soon': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="game-card group"
    >
      {/* Game Image/Icon */}
      <div className="relative mb-4 h-32 bg-gradient-to-br from-dark-700 to-dark-600 rounded-lg overflow-hidden">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center">
              <Play className="w-8 h-8 text-white" />
            </div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>
          {status}
        </div>
      </div>

      {/* Game Info */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xl font-bold text-white group-hover:text-neon-blue transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Game Stats */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-400">
            <Users className="w-3 h-3" />
            <span>{players.toLocaleString()}</span>
          </div>
          <div className={`flex items-center gap-1 ${getDifficultyColor(difficulty)}`}>
            <Zap className="w-3 h-3" />
            <span>{difficulty}</span>
          </div>
          <div className="flex items-center gap-1 text-neon-green">
            <Trophy className="w-3 h-3" />
            <span>{rewards}</span>
          </div>
        </div>

        {/* Play Button */}
        <Link
          href={`/games/${id}`}
          className={`w-full mt-4 py-2 px-4 rounded-full font-semibold text-center transition-all duration-300 flex items-center justify-center gap-2 ${
            status === 'Coming Soon'
              ? 'bg-gray-600/20 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-neon-blue to-neon-purple text-white hover:scale-105 hover:shadow-lg'
          }`}
          onClick={(e) => status === 'Coming Soon' && e.preventDefault()}
        >
          <Play className="w-4 h-4" />
          {status === 'Coming Soon' ? 'Coming Soon' : 'Play Now'}
        </Link>
      </div>
    </motion.div>
  );
};


