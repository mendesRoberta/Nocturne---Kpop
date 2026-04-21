'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  Bell, 
  Settings, 
  LayoutDashboard, 
  TrendingUp, 
  Image as ImageIcon, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Heart,
  Share2,
  Menu,
  X,
  Trash2,
  Info
} from 'lucide-react';

interface BiasDetails {
  id: string;
  name: string;
  image: string;
  fullName?: string;
  group?: string;
  age?: number;
  trendingSong?: string;
  position?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'feed' | 'gallery'>('feed');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBias, setSelectedBias] = useState<BiasDetails | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [biases, setBiases] = useState<BiasDetails[]>([]);
  const [newBiasName, setNewBiasName] = useState('');
  const [newBiasImage, setNewBiasImage] = useState('');

  // Authentication and Data Loading
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
        return;
      }
      
      setCurrentUser(session.user);
      
      // Fetch biases from Supabase
      const { data, error } = await supabase
        .from('biases')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching biases:', error);
      } else if (data) {
        setBiases(data.map((b: any) => ({
          id: b.id,
          name: b.name,
          image: b.image,
          fullName: b.full_name,
          group: b.group_name,
          age: b.age,
          trendingSong: b.trending_song,
          position: b.position
        })));
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/');
      } else {
        setCurrentUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const removeBias = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('biases')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setBiases(biases.filter(b => b.id !== id));
      if (selectedBias?.id === id) setSelectedBias(null);
    } catch (error) {
      console.error('Error removing bias:', error);
    }
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAddBias = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsValidating(true);

    if (!currentUser) {
      setValidationError("You must be logged in to add a bias.");
      setIsValidating(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Determine if "${newBiasName}" is a real K-Pop idol. If they are real, provide their current, actual details from the real world. 
        Crucially, "trendingSong" must be their LATEST official release or their currently most viral/trending song on charts (e.g. Billboard, MelOn, YouTube). 
        If not a K-Pop idol, return { "isKpopIdol": false, "errorMsg": "Not a K-Pop artist" }. 
        Only return JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isKpopIdol: { type: Type.BOOLEAN },
              fullName: { type: Type.STRING },
              stageName: { type: Type.STRING },
              group: { type: Type.STRING },
              age: { type: Type.NUMBER },
              trendingSong: { type: Type.STRING },
              position: { type: Type.STRING },
              errorMsg: { type: Type.STRING }
            },
            required: ["isKpopIdol"]
          }
        }
      });

      if (!response.text) {
        throw new Error("No response from AI");
      }
      const result = JSON.parse(response.text);

      if (!result.isKpopIdol) {
        setValidationError(result.errorMsg || "This person is not recognized as a K-Pop idol. NOCTURNE only allows K-Pop artists.");
        setIsValidating(false);
        return;
      }

      // Save to Supabase
      const { data, error: insertError } = await supabase
        .from('biases')
        .insert({
          user_id: currentUser.id,
          name: result.stageName || newBiasName,
          image: newBiasImage,
          full_name: result.fullName,
          group_name: result.group,
          age: result.age,
          trending_song: result.trendingSong,
          position: result.position
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newBias: BiasDetails = {
        id: data.id,
        name: data.name,
        image: data.image,
        fullName: data.full_name,
        group: data.group_name,
        age: data.age,
        trendingSong: data.trending_song,
        position: data.position
      };

      setBiases([newBias, ...biases]);
      setNewBiasName('');
      setNewBiasImage('');
      setIsAddModalOpen(false);
      setCurrentView('gallery');
    } catch (error) {
      console.error("Validation or save error:", error);
      setValidationError("Failed to process bias. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/40 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-8 py-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-white/5 transition-all rounded-full text-primary"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <h1 className="text-2xl font-black tracking-tighter text-primary uppercase font-headline">NOCTURNE</h1>
            </div>
            <nav className="hidden md:flex items-center gap-6 font-headline tracking-tight">
              <button 
                onClick={() => setCurrentView('feed')}
                className={`${currentView === 'feed' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-white'} font-medium transition-all pb-1`}
              >
                Feed
              </button>
              <button 
                onClick={() => setCurrentView('gallery')}
                className={`${currentView === 'gallery' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-white'} font-medium transition-all pb-1`}
              >
                Gallery
              </button>
              <a className="text-on-surface-variant font-medium hover:text-white transition-colors" href="#">Profile</a>
              <button onClick={handleLogout} className="text-on-surface-variant font-medium hover:text-white transition-colors">Logout</button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input 
                className="bg-surface-container-low/40 border-none rounded-full px-10 py-2 w-48 lg:w-64 focus:ring-1 focus:ring-primary text-sm font-body" 
                placeholder="Search..." 
                type="text" 
              />
            </div>
            <button className="p-2 hover:bg-white/5 transition-all rounded-full sm:hidden">
              <Search className="w-5 h-5 text-on-surface-variant" />
            </button>
            <button className="p-2 hover:bg-white/5 transition-all rounded-full relative">
              <Bell className="w-5 h-5 text-on-surface-variant" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border border-surface"></span>
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant/30 flex-shrink-0 cursor-pointer">
              <Image 
                src="https://picsum.photos/seed/user1/100/100" 
                alt="User profile" 
                width={40} 
                height={40} 
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-24 px-4 md:px-8 gap-0 lg:gap-0 max-w-full overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Mobile Overlay for Sidebar */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[45] lg:hidden"
              />
              <motion.aside 
                key="sidebar"
                initial={{ width: 0, opacity: 0, x: -20 }}
                animate={{ 
                  width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 256 : 288, 
                  opacity: 1, 
                  x: 0,
                  marginRight: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 24 : 0
                }}
                exit={{ width: 0, opacity: 0, x: -20, marginRight: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                className="fixed lg:sticky top-0 lg:top-24 left-0 h-screen lg:h-[calc(100vh-120px)] bg-surface-container-low/95 lg:bg-surface-container-low/60 backdrop-blur-2xl lg:backdrop-blur-2xl shadow-2xl border-r lg:border border-outline-variant/10 z-50 lg:z-40 rounded-r-3xl lg:rounded-2xl overflow-hidden shrink-0"
              >
                <div className="flex flex-col h-full py-8">
                  <div className="px-8 lg:hidden mb-8 flex justify-between items-center">
                    <h1 className="text-xl font-black tracking-tighter text-primary uppercase font-headline">NOCTURNE</h1>
                    <button onClick={() => setIsSidebarOpen(false)}><X className="w-6 h-6 text-on-surface-variant"/></button>
                  </div>
                  <div className="px-8 mb-12 hidden lg:block">
                    <p className="font-headline font-bold uppercase tracking-widest text-xs text-primary mb-1">Bias & Comeback</p>
                    <p className="text-xl font-black text-white font-headline">DISCOVER</p>
                  </div>
                  <nav className="flex flex-col gap-1 font-headline font-bold uppercase tracking-widest text-xs">
                  <button 
                    onClick={() => setCurrentView('feed')}
                    className={`flex items-center gap-4 py-3 px-6 transition-all duration-200 ${currentView === 'feed' ? 'bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-4 border-primary' : 'text-on-surface-variant hover:text-white hover:bg-white/5'}`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Feed</span>
                  </button>
                  <button 
                    onClick={() => setCurrentView('gallery')}
                    className={`flex items-center gap-4 py-3 px-6 transition-all duration-200 ${currentView === 'gallery' ? 'bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-4 border-primary' : 'text-on-surface-variant hover:text-white hover:bg-white/5'}`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Gallery</span>
                  </button>
                  <SidebarLink icon={<User className="w-4 h-4" />} label="Profile" />
                </nav>
                <div className="mt-auto px-6">
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full py-4 rounded-full bg-gradient-to-br from-primary to-primary-container text-black font-headline font-bold text-sm tracking-tighter uppercase shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                  >
                    Add Bias
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 min-w-0 pb-12">
          {currentView === 'feed' ? (
            <>
              {/* Hero Section */}
              <section className="mb-12">
                <div className="relative w-full h-[450px] rounded-2xl overflow-hidden group">
                  <Image 
                    src="https://picsum.photos/seed/concert/1920/1080" 
                    alt="Hero concert" 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                  <div className="absolute bottom-10 left-10 max-w-2xl">
                    <motion.span 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="inline-block px-4 py-1 rounded-full bg-secondary text-black text-xs font-bold tracking-widest uppercase mb-4"
                    >
                      Official Release
                    </motion.span>
                    <motion.h2 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-6xl font-headline font-extrabold text-white leading-none tracking-tighter mb-4"
                    >
                      AEON: THE NEON MIDNIGHT TOUR
                    </motion.h2>
                    <motion.p 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-lg text-on-surface-variant font-body mb-6"
                    >
                      Experience the global sensation’s most ambitious production yet. Digital tickets and VIP access now live.
                    </motion.p>
                    <div className="flex gap-4">
                      <button className="px-8 py-3 rounded-full bg-primary text-black font-headline font-bold uppercase text-sm tracking-tight hover:brightness-110 transition-all">Reserve Pass</button>
                      <button className="px-8 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white font-headline font-bold uppercase text-sm tracking-tight hover:bg-white/20 transition-all">View Details</button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Trending Card */}
                <div className="bg-surface-container-high rounded-2xl overflow-hidden group border border-outline-variant/10">
                  <div className="relative h-64">
                    <Image 
                      src="https://picsum.photos/seed/artist1/800/600" 
                      alt="Artist teaser" 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-tertiary rounded-full text-[10px] font-black uppercase text-black">Trending Now</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-headline font-bold mb-2 leading-tight">SOLO DEBUT: Luna&apos;s &apos;Silver Lining&apos; Teaser Drops</h3>
                    <p className="text-on-surface-variant text-sm mb-4 line-clamp-2">The highly anticipated solo project from X-Girls&apos; lead vocalist explores themes of cyber-existentialism.</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">2m ago • Editorial</span>
                      <Heart className="w-5 h-5 text-primary cursor-pointer fill-primary" />
                    </div>
                  </div>
                </div>

                {/* Chart Pulse Card */}
                <div className="bg-surface-container-high rounded-2xl overflow-hidden group flex flex-col border border-outline-variant/10">
                  <div className="p-8 flex-1 flex flex-col justify-center text-center bg-gradient-to-br from-primary/10 to-transparent">
                    <Zap className="w-12 h-12 text-primary mx-auto mb-6" />
                    <h3 className="text-3xl font-headline font-extrabold mb-4 italic tracking-tighter uppercase">Chart Pulse</h3>
                    <p className="text-on-surface-variant font-body mb-6 italic">Real-time engagement metrics for &apos;Neon Heart&apos; are breaking records across all platforms.</p>
                    <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '88%' }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-primary"
                      ></motion.div>
                    </div>
                    <p className="text-[10px] font-bold text-on-surface-variant mt-2 uppercase tracking-[0.2em]">+14% Momentum</p>
                  </div>
                </div>

                {/* BTS Card */}
                <div className="bg-surface-container-high rounded-2xl overflow-hidden group border border-outline-variant/10">
                  <div className="relative h-64">
                    <Image 
                      src="https://picsum.photos/seed/bts/800/600" 
                      alt="BTS" 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-surface-container-high to-transparent">
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase text-white border border-white/20">Exclusive BTS</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-headline font-bold mb-2 leading-tight">Behind the Scenes: Choreography Camp</h3>
                    <p className="text-on-surface-variant text-sm mb-4 line-clamp-2">Take an inside look at the 14-hour rehearsal days leading up to the Tokyo Dome performance.</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">15m ago • Video</span>
                      <Share2 className="w-5 h-5 text-on-surface-variant cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Upcoming Drops */}
              <section className="mt-16">
                <div className="flex items-center justify-between mb-8 px-2 md:px-0">
                  <h2 className="text-3xl font-headline font-black uppercase tracking-tighter flex items-center gap-3">
                    <span className="w-8 h-[2px] bg-primary"></span>
                    Upcoming Drops
                  </h2>
                  <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-variant transition-all">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-variant transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-6 overflow-x-auto no-scrollbar pb-6">
                  <DropCard date="Nov 24" title="Midnight Protocol" type="Digital Single" seed="album1" />
                  <DropCard date="Dec 02" title="Ethereal Drift" type="Mini Album" seed="album2" />
                  <DropCard date="Dec 05" title="Remix Pack Vol. 4" type="EP" seed="album3" />
                  <DropCard date="Dec 12" title="Velvet Horizon" type="LP" seed="album4" />
                  <DropCard date="Dec 20" title="Neon Genesis" type="Single" seed="album5" />
                </div>
              </section>
            </>
          ) : (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8 md:mb-12">
                <h2 className="text-3xl md:text-5xl font-headline font-black uppercase tracking-tighter flex items-center gap-3 md:gap-4">
                  <span className="w-8 md:w-12 h-[2px] md:h-[4px] bg-secondary"></span>
                  Bias Gallery
                </h2>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-8 py-3 rounded-full bg-secondary text-black font-headline font-bold uppercase text-sm tracking-tight hover:brightness-110 transition-all"
                >
                  Add New Bias
                </button>
              </div>
              
              {biases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-3xl border border-outline-variant/10">
                  <ImageIcon className="w-16 h-16 text-on-surface-variant mb-4 opacity-20" />
                  <p className="text-on-surface-variant font-headline font-bold uppercase tracking-widest">Your gallery is empty</p>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-6 text-primary font-bold hover:underline"
                  >
                    Add your first bias
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {biases.map((bias) => (
                    <motion.div 
                      key={bias.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setSelectedBias(bias)}
                      className="group relative aspect-square rounded-2xl overflow-hidden border border-outline-variant/10 cursor-pointer shadow-lg hover:shadow-primary/10 transition-all"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={bias.image} 
                        alt={bias.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
                        <div className="flex justify-end">
                          <button 
                            onClick={(e) => removeBias(bias.id, e)}
                            className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white backdrop-blur-sm transition-all transform hover:scale-110"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <p className="text-secondary font-headline font-black text-xl uppercase tracking-tighter">{bias.name}</p>
                          <div className="flex items-center gap-2">
                             <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Verified Bias</p>
                             <Info className="w-3 h-3 text-secondary" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>

        {/* Right Sidebar Widgets */}
        <aside className="hidden xl:block w-80 shrink-0 sticky top-24 h-[calc(100vh-120px)]">
          <div className="flex flex-col gap-8">
            <div className="glass-panel p-6 rounded-2xl border border-outline-variant/10">
              <h3 className="text-xs font-black tracking-widest uppercase text-on-surface-variant mb-6">Trending Pulse</h3>
              <div className="flex flex-wrap gap-2">
                <Tag label="#AEON_WORLDTOUR" />
                <Tag label="#LUNA_SOLO" />
                <Tag label="#NOCTURNE_EXCLUSIVES" />
                <Tag label="#KPOP_REMIX" />
                <Tag label="#FASHION_WEEK" />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-outline-variant/10">
              <h3 className="text-xs font-black tracking-widest uppercase text-on-surface-variant mb-6">Live Tracker</h3>
              <div className="space-y-6">
                <ActivityItem initial="J" text="Jin_X just pre-ordered AEON" time="2m ago" color="bg-primary/20 text-primary" />
                <ActivityItem initial="M" text="Mika.99 shared Luna&apos;s Teaser" time="5m ago" color="bg-secondary/20 text-secondary" />
                <ActivityItem initial="K" text="K-Pulse liked Gallery: Seoul" time="12m ago" color="bg-tertiary/20 text-tertiary" />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Add Bias Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-panel rounded-3xl p-8 md:p-10 border border-primary/20 shadow-[0_0_50px_rgba(223,142,255,0.1)]"
            >
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
              
              <h3 className="text-3xl font-headline font-black uppercase tracking-tighter mb-2 text-primary">Add Your Bias</h3>
              <p className="text-on-surface-variant text-sm mb-8">Personalize your NOCTURNE experience.</p>
              
              <form onSubmit={handleAddBias} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-4">Idol Name</label>
                  <input 
                    required
                    value={newBiasName}
                    onChange={(e) => setNewBiasName(e.target.value)}
                    className="w-full bg-surface-container-low/40 border-none rounded-full px-6 py-4 focus:ring-1 focus:ring-primary text-sm" 
                    placeholder="e.g. Lisa, Jungkook, Momo..." 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-4">Image URL</label>
                  <input 
                    required
                    value={newBiasImage}
                    onChange={(e) => setNewBiasImage(e.target.value)}
                    className="w-full bg-surface-container-low/40 border-none rounded-full px-6 py-4 focus:ring-1 focus:ring-primary text-sm" 
                    placeholder="https://images.unsplash.com/..." 
                  />
                </div>
                
                {validationError && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-xs font-bold px-4"
                  >
                    {validationError}
                  </motion.p>
                )}

                <button 
                  type="submit"
                  disabled={isValidating}
                  className="w-full py-4 rounded-full bg-primary text-black font-headline font-bold uppercase text-sm tracking-tight hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <Zap className="w-4 h-4 animate-pulse" />
                      <span>Validating Idol...</span>
                    </>
                  ) : (
                    "Confirm Addition"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bias Detail Modal */}
      <AnimatePresence>
        {selectedBias && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBias(null)}
              className="absolute inset-0 bg-background/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-4xl glass-panel rounded-3xl overflow-hidden border border-primary/20 shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:h-auto overflow-y-auto md:overflow-hidden"
            >
              <button 
                onClick={() => setSelectedBias(null)}
                className="absolute top-6 right-6 z-[120] p-2 bg-black/40 hover:bg-black/60 rounded-full transition-all text-white backdrop-blur-md"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-full md:w-1/2 relative aspect-[4/5] md:aspect-auto md:h-auto overflow-hidden">
                <div className="absolute inset-0 md:hidden bg-gradient-to-t from-background to-transparent z-10" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={selectedBias.image} 
                  alt={selectedBias.name} 
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-surface-container-low/40 relative z-20 -mt-20 md:mt-0">
                <p className="text-primary font-headline font-black text-xs uppercase tracking-[0.3em] mb-2">{selectedBias.group || "Solo Artist"}</p>
                <h2 className="text-5xl font-headline font-black text-white uppercase tracking-tighter leading-none mb-6">
                  {selectedBias.name}
                </h2>

                <div className="grid grid-cols-1 gap-6 mb-8 text-on-surface-variant">
                  <DetailItem label="Full Name" value={selectedBias.fullName || "Unknown"} />
                  <DetailItem label="Position" value={selectedBias.position || "Vocalist"} />
                  <DetailItem label="Age" value={selectedBias.age ? `${selectedBias.age} Years Old` : "Unknown"} />
                  <DetailItem label="Trending Song" value={selectedBias.trendingSong || "Midnight Pulse"} highlight />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      const query = `${selectedBias.name} ${selectedBias.trendingSong || 'song'} official mv`;
                      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
                    }}
                    className="flex-1 py-4 rounded-full bg-gradient-to-r from-primary to-primary-container text-black font-headline font-black uppercase text-sm tracking-tight hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                  >
                    Watch Official M/V
                  </button>
                  <button className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white">
                    <Heart className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 h-16 glass-panel rounded-full flex items-center justify-around z-50 border border-white/10">
        <button onClick={() => setCurrentView('feed')}>
          <LayoutDashboard className={`w-6 h-6 ${currentView === 'feed' ? 'text-primary' : 'text-on-surface-variant'}`} />
        </button>
        <button onClick={() => setCurrentView('gallery')}>
          <ImageIcon className={`w-6 h-6 ${currentView === 'gallery' ? 'text-primary' : 'text-on-surface-variant'}`} />
        </button>
        <User className="w-6 h-6 text-on-surface-variant" />
      </div>
    </div>
  );
}

function SidebarLink({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <a className={`flex items-center gap-4 py-3 px-6 transition-all duration-200 ${active ? 'bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-4 border-primary' : 'text-on-surface-variant hover:text-white hover:bg-white/5'}`} href="#">
      {icon}
      <span>{label}</span>
    </a>
  );
}

function DropCard({ date, title, type, seed }: { date: string, title: string, type: string, seed: string }) {
  return (
    <div className="min-w-[280px] bg-surface-container-high p-4 rounded-2xl border border-outline-variant/10 group cursor-pointer hover:border-primary/30 transition-all">
      <div className="w-full aspect-square rounded-xl overflow-hidden mb-4 relative">
        <Image 
          src={`https://picsum.photos/seed/${seed}/400/400`} 
          alt={title} 
          fill 
          className="object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
      </div>
      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{date}</p>
      <h4 className="font-headline font-bold text-white uppercase truncate">{title}</h4>
      <p className="text-xs text-on-surface-variant font-body">{type}</p>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="px-4 py-2 rounded-full bg-surface-container text-[11px] font-bold text-white hover:bg-primary/20 hover:text-primary cursor-pointer transition-all border border-outline-variant/20">
      {label}
    </span>
  );
}

function ActivityItem({ initial, text, time, color }: { initial: string, text: string, time: string, color: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${color}`}>
        {initial}
      </div>
      <div>
        <p className="text-xs font-bold text-white">{text}</p>
        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">{time}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value, highlight = false }: { label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">{label}</span>
      <span className={`text-xl font-headline font-bold uppercase ${highlight ? 'text-secondary italic' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}
