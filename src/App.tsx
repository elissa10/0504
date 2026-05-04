/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { Plus, Calendar, Settings, User, Hash, Heart, MessageCircle, Share2, X, Send, Smile, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import React from "react";
import { auth, db } from "./firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  Timestamp 
} from "firebase/firestore";

interface Post {
  id: string;
  date: string;
  mood: string;
  content: string;
  imageUrl?: string;
  tags: string[];
  likes: number;
  authorId: string;
  createdAt?: any;
}

const INITIAL_POSTS: Post[] = [
  {
    id: "1",
    date: "2024.05.04",
    mood: "✨",
    content: "오늘은 오랜만에 날씨가 정말 좋았다. 공원에 나가서 산책을 하며 보라색 꽃들을 구경했는데, 마음이 정말 평온해지는 느낌이었다.",
    tags: ["일상", "산책", "힐링"],
    likes: 12,
    authorId: "system"
  },
  {
    id: "2",
    date: "2024.05.03",
    mood: "☕",
    content: "새로 발견한 조용한 카페에서 마신 라떼가 정말 맛있었다. 가끔은 이렇게 혼자만의 시간을 가지는 것도 나쁘지 않은 것 같다.",
    tags: ["커피", "혼자서", "여유"],
    likes: 8,
    authorId: "system"
  },
  {
    id: "3",
    date: "2024.05.02",
    mood: "🌙",
    content: "밤샘 작업 끝에 드디어 프로젝트를 마무리했다! 결과물이 잘 나와서 뿌듯하긴 하지만, 당분간은 좀 쉬어야겠다.",
    tags: ["공부", "열정", "마무리"],
    likes: 24,
    authorId: "system"
  }
];

const MOODS = ["✨", "☕", "🌙", "🫠", "🌈"];

const PostCard = ({ post, onDelete, currentUserId }: { post: Post; onDelete: (id: string) => void; currentUserId?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.01, y: -5 }}
      layout
      className="group relative rounded-3xl bg-white/10 border border-white/20 backdrop-blur-xl p-6 transition-all duration-300 hover:bg-white/[0.15] hover:shadow-[0_20px_50px_rgba(0,0,0,0.2),0_0_20px_rgba(255,255,255,0.05)] overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-transparent to-emerald-400/0 group-hover:from-purple-500/5 group-hover:to-emerald-400/5 transition-colors duration-500" />
      
      <div className="relative z-10 flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-white/50 text-xs font-medium">
          <Calendar className="w-3.5 h-3.5" />
          <span>{post.date}</span>
        </div>
        <div className="flex items-center gap-2">
          {currentUserId === post.authorId && (
            <button 
              onClick={() => onDelete(post.id)}
              className="w-8 h-8 rounded-xl bg-red-500/0 text-white/0 group-hover:bg-red-500/10 group-hover:text-red-400 flex items-center justify-center transition-all hover:bg-red-500/20 active:scale-90"
              title="삭제하기"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-xl shadow-inner border border-white/5">
            {post.mood}
          </div>
        </div>
      </div>

      {post.imageUrl && (
        <div className="relative z-10 mb-4 rounded-2xl overflow-hidden aspect-[16/9] border border-white/10">
          <img 
            src={post.imageUrl} 
            alt="Record" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      <div className="relative z-10 mb-6">
        <p className="text-white/90 leading-relaxed text-sm lg:text-base whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      <div className="relative z-10 flex flex-wrap gap-2 mb-6">
        {post.tags.map((tag) => (
          <span 
            key={tag} 
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/60 font-medium tracking-wide uppercase"
          >
            <Hash className="w-2.5 h-2.5" />
            {tag}
          </span>
        ))}
      </div>

      <div className="relative z-10 pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-xs">
            <Heart className="w-4 h-4" />
            <span>{post.likes}</span>
          </button>
          <button className="text-white/40 hover:text-white/80 transition-colors">
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
        <button className="text-white/40 hover:text-white/80 transition-colors">
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "gallery">("list");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string | null>(null);

  // Calendar State for Navigation
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setFormDate(selectedDate.toISOString().split('T')[0]);
    setIsCalendarOpen(false);
    setIsModalOpen(true);
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Subscription
  useEffect(() => {
    const q = query(collection(db, "posts"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      }) as Post[];

      fetchedPosts.sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return timeB - timeA;
      });

      setPosts(fetchedPosts);
      setIsLoaded(true);
      setError(null);
    }, (err) => {
      console.error("Firestore onSnapshot Error:", err);
      if (err instanceof Error) {
        if (err.message.includes("permission-denied")) {
          // If we're logged in but still get permission denied, it's a real error
          // If we're logged out, it's expected
          if (currentUser) {
            setError("데이터를 불러올 권한이 없습니다.");
          } else {
            setPosts([]); // Clear posts if logged out
          }
        } else {
          setError(`데이터를 불러오는 중 오류가 발생했습니다: ${err.message}`);
        }
      }
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, [currentUser]); // Re-subscribe when auth state changes

  // Form States
  const [formMood, setFormMood] = useState(MOODS[0]);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formOneLine, setFormOneLine] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // Limit to ~800KB to stay safe with base64 expansion
        alert("이미지 크기가 너무 큽니다. 800KB 이하의 이미지를 선택해주세요.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPost = async () => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!formContent.trim()) return;

    setIsSubmitting(true);
    try {
      // Extract tags from content if any
      const tags = formContent.match(/#[\w가-힣]+/g)?.map(t => t.slice(1)) || ["기록"];

      const postData = {
        date: formDate.replace(/-/g, '.'),
        mood: formMood,
        content: formOneLine ? `${formOneLine}\n\n${formContent}` : formContent,
        imageUrl: formImageUrl || null,
        tags: tags,
        likes: 0,
        authorId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "posts"), postData);

      setIsModalOpen(false);
      // Reset form
      setFormOneLine("");
      setFormContent("");
      setFormMood(MOODS[0]);
      setFormImageUrl("");
      setError(null);
    } catch (err: any) {
      console.error("Add Post Error:", err);
      let msg = "저장에 실패했습니다.";
      if (err.message.includes("permission-denied")) {
        msg = "권한이 없습니다. 보안 규칙에 따라 데이터 크기가 너무 클 수도 있습니다.";
      } else {
        msg = err.message;
      }
      setError(msg);
      alert(`기록 저장에 실패했습니다: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (confirm("정말로 이 기록을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "posts", id));
      } catch (error) {
        console.error("Delete Error:", error);
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 font-sans text-slate-50 selection:bg-purple-500/30 overflow-x-hidden">
      {/* --- Animated Background Elements --- */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-purple-600/20 blur-[120px] animate-gradient-slow" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-emerald-400/20 blur-[120px] animate-gradient-slower" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-blue-500/10 blur-[150px]" />
      </div>

      {/* --- Main Layout --- */}
      <div className="relative z-10 flex flex-col min-h-screen max-w-2xl mx-auto px-4 sm:px-6">
        
        {/* Header Section */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="pt-12 pb-8 flex items-center justify-between"
        >
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              나의 하루 기록
            </h1>
            <p className="text-sm text-slate-400 font-medium">오늘의 소중한 순간을 담아보세요</p>
          </div>
          
          <button 
            onClick={currentUser ? handleLogout : handleLogin}
            className="flex items-center gap-2 pr-4 pl-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group"
          >
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Profile" className="w-7 h-7 rounded-full border border-white/20" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <User className="w-4 h-4 text-white/50" />
              </div>
            )}
            <span className="text-xs font-medium text-white/80">
              {currentUser ? "로그아웃" : "로그인"}
            </span>
          </button>
        </motion.header>

        {/* Content Area */}
        <motion.main 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="flex-1 flex flex-col pt-4"
        >
          <div className={`flex-1 pb-32 ${viewMode === 'gallery' ? 'grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6' : 'space-y-6'}`}>
            {filterDate && (
              <div className={`flex items-center justify-between p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-sm mb-2 ${viewMode === 'gallery' ? 'col-span-full' : ''}`}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-bold">{filterDate}</span> <span>기록만 보는 중</span>
                </div>
                <button 
                  onClick={() => setFilterDate(null)}
                  className="text-xs underline opacity-60 hover:opacity-100"
                >
                  필터 해제
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
                <p className="font-bold mb-1">문제가 발생했습니다:</p>
                <p className="text-red-400/80">{error}</p>
              </div>
            )}

            {!currentUser && isLoaded && (
              <div className="p-8 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-200/80 text-sm text-center mb-6">
                <p className="font-bold mb-2 text-base">로그인이 필요합니다</p>
                <p className="mb-4">기록을 작성하고 확인하려면 구글 계정으로 로그인해주세요.</p>
                <button 
                  onClick={handleLogin}
                  className="px-6 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30 transition-colors"
                >
                  구글로 시작하기
                </button>
              </div>
            )}

            {!isLoaded && (
              <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/40 animate-spin mb-4" />
                <p className="text-white/20 text-sm font-medium">기록을 불러오는 중...</p>
              </div>
            )}

            {isLoaded && posts.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                  <Smile className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-xl font-bold text-white/40 mb-2">기록이 비어있어요</h3>
                <p className="text-white/20 text-sm max-w-[240px]">오늘 하루 어떤 특별한 일이 있었나요? 지금 바로 기록해보세요!</p>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {posts
                .filter(post => !filterDate || post.date === filterDate)
                .map((post) => {
                  if (viewMode === "gallery") {
                    return (
                      <motion.div
                        key={post.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => {
                          setFilterDate(post.date);
                          setViewMode("list");
                        }}
                        className="aspect-square rounded-[2rem] overflow-hidden bg-white/5 border border-white/10 relative group cursor-pointer shadow-lg hover:shadow-purple-500/10 transition-all"
                      >
                        {post.imageUrl ? (
                          <img src={post.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-white/5 to-transparent">
                            <span className="text-3xl mb-3">{post.mood}</span>
                            <p className="text-[11px] text-white/40 leading-relaxed line-clamp-3 italic">"{post.content.split('\n')[0]}"</p>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                          <p className="text-[10px] text-white/90 font-mono tracking-tighter">{post.date}</p>
                        </div>
                      </motion.div>
                    );
                  }
                  return (
                    // @ts-ignore
                    <PostCard key={post.id} post={post} onDelete={handleDeletePost} currentUserId={currentUser?.uid} />
                  );
                })}
            </AnimatePresence>
            
            {viewMode === "list" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={() => setIsModalOpen(true)}
                className="rounded-3xl border-2 border-dashed border-white/5 p-12 flex flex-col items-center justify-center group hover:border-white/10 transition-colors cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                  <Plus className="w-7 h-7 text-white/10 group-hover:text-white/30 transition-colors" />
                </div>
                <p className="text-white/20 text-sm font-medium tracking-wide group-hover:text-white/30 transition-colors font-mono uppercase">NEW RECORD</p>
              </motion.div>
            )}
          </div>
        </motion.main>

        {/* FAB & Bottom Nav */}
        <motion.nav 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="fixed bottom-8 left-12 right-12 md:left-auto md:right-12 md:w-auto flex items-center justify-between md:justify-start gap-6 px-6 py-4 rounded-full bg-slate-900/40 border border-white/10 backdrop-blur-xl shadow-lg z-50"
        >
          <button 
            onClick={() => setIsCalendarOpen(true)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <Calendar className="w-6 h-6" />
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-emerald-400 shadow-xl shadow-purple-500/30 hover:scale-110 active:scale-95 transition-all text-slate-950"
          >
            <Plus className="w-8 h-8 font-extrabold" />
          </button>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </motion.nav>

        {/* --- Calendar Modal --- */}
        <AnimatePresence>
          {isCalendarOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsCalendarOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-sm bg-white/10 border border-white/20 backdrop-blur-2xl rounded-[32px] shadow-2xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    {currentMonth.toLocaleString('ko-KR', { year: 'numeric', month: 'long' })}
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['일','월','화','수','목','금','토'].map(d => <span key={d} className="text-[10px] font-bold text-white/20">{d}</span>)}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth()) }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()) }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${currentMonth.getFullYear()}.${String(currentMonth.getMonth() + 1).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
                    const hasRecord = posts.some(p => p.date === dateStr);
                    return (
                      <button
                        key={day}
                        onClick={() => handleDateClick(day)}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                          hasRecord ? 'bg-purple-500/20 text-purple-200' : 'hover:bg-white/5 text-white/60'
                        }`}
                      >
                        <span className="text-xs font-medium">{day}</span>
                        {hasRecord && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-purple-400" />}
                      </button>
                    );
                  })}
                </div>

                <button 
                  onClick={() => { setFilterDate(null); setIsCalendarOpen(false); }}
                  className="w-full mt-6 py-3 rounded-2xl bg-white/5 text-[10px] uppercase tracking-widest font-bold text-white/40 hover:text-white transition-colors"
                >
                  전체 기록 보기
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- Settings Modal --- */}
        <AnimatePresence>
          {isSettingsOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsSettingsOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-sm bg-white/10 border border-white/20 backdrop-blur-2xl rounded-[32px] shadow-2xl p-8"
              >
                <button onClick={() => setIsSettingsOpen(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-white/40 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold mb-6">설정</h2>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30">보기 모드</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                      <button 
                        onClick={() => setViewMode('list')}
                        className={`py-3 rounded-xl text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                      >
                        목록으로 보기
                      </button>
                      <button 
                        onClick={() => setViewMode('gallery')}
                        className={`py-3 rounded-xl text-xs font-bold transition-all ${viewMode === 'gallery' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                      >
                        이미지만 보기
                      </button>
                    </div>
                  </div>

                  {currentUser ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                        <img src={currentUser.photoURL || ""} alt="" className="w-10 h-10 rounded-full border border-white/20" />
                        <div>
                          <p className="text-sm text-white font-bold">{currentUser.displayName}</p>
                          <p className="text-white/40 text-[10px]">{currentUser.email}</p>
                        </div>
                      </div>
                      <button onClick={() => { handleLogout(); setIsSettingsOpen(false); }} className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-all">
                        로그아웃
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { handleLogin(); setIsSettingsOpen(false); }} className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-emerald-400 text-slate-950 font-bold">
                      구글 로그인하기
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- Write Modal --- */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
              />
              
              {/* Modal Content */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-xl bg-white/10 border border-white/20 backdrop-blur-2xl rounded-[32px] shadow-2xl p-8 overflow-hidden"
              >
                {/* Close Button */}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="space-y-8">
                  <header>
                    <h2 className="text-2xl font-bold text-white mb-1">새로운 기록</h2>
                    <p className="text-sm text-white/40 italic">어떤 하루를 보내셨나요?</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Date Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/60 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        기록 날짜
                      </label>
                      <input 
                        type="date" 
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition-colors"
                      />
                    </div>

                    {/* Mood Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/60 flex items-center gap-2">
                        <Smile className="w-3 h-3" />
                        오늘의 기분
                      </label>
                      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 justify-between">
                        {MOODS.map((mood) => (
                          <button
                            key={mood}
                            onClick={() => setFormMood(mood)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                              formMood === mood ? "bg-white/20 scale-110 shadow-lg text-white" : "opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
                            }`}
                          >
                            {mood}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-semibold text-white/60 flex items-center gap-2">
                        <ImageIcon className="w-3 h-3" />
                        사진 첨부
                      </label>
                      <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer aspect-[16/9] flex items-center justify-center">
                        {formImageUrl ? (
                          <>
                            <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormImageUrl("");
                                }}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div 
                            className="w-full h-full flex flex-col items-center justify-center gap-2"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <div className="p-3 rounded-2xl bg-white/5">
                              <Plus className="w-5 h-5 text-white/40" />
                            </div>
                            <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Upload Image</span>
                          </div>
                        )}
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleImageChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Text Inputs */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/60">오늘 하루 한 줄</label>
                      <input 
                        type="text" 
                        placeholder="이 순간을 기억할 제목을 적어주세요"
                        value={formOneLine}
                        onChange={(e) => setFormOneLine(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/20"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/60">상세 내용</label>
                      <textarea 
                        rows={5}
                        placeholder="더 전하고 싶은 이야기가 있나요?"
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-3xl px-4 py-4 text-sm text-white outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/20 resize-none font-sans"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSubmitting}
                      className="flex-1 py-4 rounded-2xl bg-white/5 text-white/60 font-semibold hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleAddPost}
                      disabled={!formContent || isSubmitting || !currentUser}
                      className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-emerald-400 text-slate-950 font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {currentUser ? "기록 완료" : "로그인 후 기록 가능"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

