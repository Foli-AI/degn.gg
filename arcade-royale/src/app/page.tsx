'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Gamepad2, Zap, Trophy, Coins, Users, Play, Clock } from 'lucide-react';
import { useSocket, GameRoom } from '@/lib/socket';

export default function HomePage() {
  const socket = useSocket();
  const [activeRooms, setActiveRooms] = useState<GameRoom[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState(0);

  useEffect(() => {
    // Connect to socket and request initial data
    const socketInstance = socket.connect();

    // Listen for rooms list
    socket.on('rooms-list', (rooms: GameRoom[]) => {
      setActiveRooms(rooms);
      const totalPlayers = rooms.reduce((sum, room) => sum + room.players.length, 0);
      setOnlinePlayers(totalPlayers);
    });

    // Listen for room updates
    socket.on('room-updated', (room: GameRoom) => {
      setActiveRooms(prev => {
        const updated = prev.map(r => r.id === room.id ? room : r);
        if (!updated.find(r => r.id === room.id)) {
          updated.push(room);
        }
        return updated;
      });
    });

    // Request initial rooms data
    socket.emit('request-rooms');

    // Cleanup on unmount
    return () => {
      socket.off('rooms-list');
      socket.off('room-updated');
    };
  }, [socket]);

  const features = [
    {
      icon: Gamepad2,
      title: 'Retro Arcade Games',
      description: 'Classic arcade experiences reimagined for the blockchain era'
    },
    {
      icon: Coins,
      title: 'Earn While Playing',
      description: 'Win real crypto rewards and climb the leaderboards'
    },
    {
      icon: Trophy,
      title: 'Competitive Gaming',
      description: 'Battle other players in skill-based tournaments'
    },
    {
      icon: Zap,
      title: 'Instant Payouts',
      description: 'Lightning-fast Solana transactions and withdrawals'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-cyber-grid bg-grid opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/10 via-transparent to-neon-blue/10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-cyber font-bold mb-6">
                <span className="text-white">ARCADE</span>
                <br />
                <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                  ROYALE
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Play. Earn. Repeat.
                <br />
                <span className="text-neon-blue font-semibold">
                  The Future of On-Chain Arcade Gaming.
                </span>
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            >
              <Link href="/games" className="btn-primary group">
                <span className="flex items-center gap-2">
                  Enter Arcade
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              
              <button className="btn-secondary">
                Watch Trailer
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            >
              {[
                { label: 'Active Rooms', value: activeRooms.length.toString() },
                { label: 'Online Players', value: onlinePlayers.toString() },
                { label: 'Total Pot', value: `${activeRooms.reduce((sum, room) => sum + room.totalPot, 0)} SOL` },
                { label: 'Games Available', value: '4' }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-neon-blue mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Active Rooms Section */}
      {activeRooms.length > 0 && (
        <section className="py-16 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-cyber font-bold text-white mb-4">
                🔥 Live Game Rooms
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Jump into active matches or spectate ongoing games
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeRooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="game-card group hover:bg-gradient-to-br hover:from-neon-purple/10 hover:to-neon-blue/10"
                >
                  {/* Room Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{room.name}</h3>
                      <p className="text-sm text-neon-blue font-semibold">{room.game}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      room.status === 'waiting' ? 'bg-green-500/20 text-green-400' :
                      room.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {room.status === 'waiting' ? 'Open' : 
                       room.status === 'running' ? 'Live' : 'Finished'}
                    </div>
                  </div>

                  {/* Room Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-300 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">Players</span>
                      </div>
                      <div className="text-white font-bold">
                        {room.players.length}/{room.maxPlayers}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-300 mb-1">
                        <Coins className="w-4 h-4" />
                        <span className="text-sm">Pot</span>
                      </div>
                      <div className="text-neon-blue font-bold">
                        {room.totalPot} SOL
                      </div>
                    </div>
                  </div>

                  {/* Entry Range */}
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-400">
                      Entry: {room.minEntry} - {room.maxEntry} SOL
                    </p>
                  </div>

                  {/* Action Button */}
                  <Link 
                    href={`/game/${room.id}`}
                    className="w-full btn-primary text-center group-hover:bg-gradient-to-r group-hover:from-neon-blue group-hover:to-neon-purple transition-all duration-300"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {room.status === 'waiting' ? (
                        <>
                          <Play className="w-4 h-4" />
                          Join Game
                        </>
                      ) : room.status === 'running' ? (
                        <>
                          <Clock className="w-4 h-4" />
                          Spectate
                        </>
                      ) : (
                        <>
                          <Trophy className="w-4 h-4" />
                          View Results
                        </>
                      )}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Create Room CTA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <Link href="/games" className="btn-secondary">
                Create New Room
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-cyber font-bold text-white mb-4">
              Why Choose Arcade Royale?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Experience the perfect blend of nostalgic gaming and cutting-edge blockchain technology
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="game-card text-center group hover:bg-gradient-to-br hover:from-neon-purple/5 hover:to-neon-blue/5"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 to-neon-blue/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-cyber font-bold text-white mb-6">
              Ready to Start Playing?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Connect your Phantom wallet and dive into the future of arcade gaming. 
              Your first 1000 credits are on us!
            </p>
            <Link href="/games" className="btn-primary text-lg px-12 py-4">
              Launch Games
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

