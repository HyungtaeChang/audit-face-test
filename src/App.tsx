/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, RefreshCw, ShieldCheck, AlertTriangle, User, Info, ChevronRight, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeFaceIntegrity, AnalysisResult } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setShowCamera(true);
      // Stop existing tracks if any
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("카메라를 시작할 수 없습니다. 권한을 확인해주세요.");
      setShowCamera(false);
    }
  };

  const toggleCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (showCamera) {
      await startCamera(newMode);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const runAnalysis = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeFaceIntegrity(image);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setShowCamera(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col items-center p-4 pb-12">
      {/* Header */}
      <header className="w-full max-w-md text-center py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-block p-3 bg-indigo-600 rounded-2xl shadow-lg mb-4"
        >
          <ShieldCheck className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold font-display text-slate-900 tracking-tight">
          관상 청렴도 테스트
        </h1>
        <p className="text-slate-500 mt-2">
          당신의 얼굴에 숨겨진 '청렴 DNA'를 찾아보세요
        </p>
      </header>

      <main className="w-full max-w-md space-y-6">
        {/* Image Display / Camera */}
        <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden bg-slate-200 shadow-inner border-4 border-white">
          <AnimatePresence mode="wait">
            {!image && !showCamera && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4"
              >
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-slate-400 font-medium">분석할 사진을 찍거나 업로드하세요</p>
              </motion.div>
            )}

            {showCamera && (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-6 items-center">
                  <button
                    onClick={stopCamera}
                    className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white"
                  >
                    취소
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-white/30"
                  >
                    <div className="w-12 h-12 bg-indigo-600 rounded-full" />
                  </button>
                  <button
                    onClick={toggleCamera}
                    className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white"
                  >
                    <RefreshCw className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            )}

            {image && !showCamera && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0"
              >
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                    <RefreshCw className="w-12 h-12 animate-spin mb-4" />
                    <p className="font-bold text-xl animate-pulse">관상 분석 중...</p>
                    <p className="text-sm opacity-80 mt-2">횡령의 기운을 감지하고 있습니다</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        {!result && !isAnalyzing && (
          <div className="grid grid-cols-2 gap-4">
            {!image ? (
              <>
                <button
                  onClick={() => startCamera()}
                  className="flex flex-col items-center justify-center p-6 glass-card rounded-3xl hover:bg-slate-100 transition-colors group"
                >
                  <Camera className="w-8 h-8 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-700">사진 찍기</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 glass-card rounded-3xl hover:bg-slate-100 transition-colors group"
                >
                  <Upload className="w-8 h-8 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-700">업로드</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={reset}
                  className="flex items-center justify-center p-4 glass-card rounded-2xl text-slate-600 font-semibold"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  다시 찍기
                </button>
                <button
                  onClick={runAnalysis}
                  className="flex items-center justify-center p-4 bg-indigo-600 rounded-2xl text-white font-bold shadow-lg shadow-indigo-200"
                >
                  분석 시작
                </button>
              </>
            )}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileUpload}
        />

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-start"
          >
            <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className={cn(
              "p-8 rounded-[2rem] text-center shadow-2xl relative overflow-hidden",
              result.type === 'scholar' ? "bg-emerald-600 text-white" : 
              result.type === 'corrupt' ? "bg-rose-600 text-white" : "bg-slate-800 text-white"
            )}>
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl" />

              <div className="relative z-10">
                <div className="inline-block px-4 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                  AI 관상 분석 결과
                </div>
                <h2 className="text-4xl font-black mb-2 leading-tight">
                  {result.score}점
                </h2>
                <p className="text-xl font-bold opacity-90 mb-6">
                  "{result.title}"
                </p>
                
                <div className="w-full bg-black/20 rounded-full h-3 mb-8">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-white rounded-full relative"
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg" />
                  </motion.div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-sm leading-relaxed text-left">
                  <p>{result.description}</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 mb-1">주의사항</h3>
                <p className="text-amber-800 text-sm leading-relaxed">
                  {result.warning}
                </p>
              </div>
            </div>

            <button
              onClick={reset}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center group"
            >
              다시 테스트하기
              <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}

        {/* Footer Info */}
        {!result && !isAnalyzing && (
          <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
            <div className="flex items-center gap-3 mb-3">
              <Info className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-indigo-900">어떻게 분석하나요?</h3>
            </div>
            <p className="text-indigo-800/70 text-sm leading-relaxed">
              최첨단 AI가 눈매, 입꼬리, 콧날 등 1,000여 개의 안면 특징을 분석하여 
              당신이 법인카드를 어떻게 쓸지, 비타500 박스를 어떻게 대할지 예측합니다.
              <br/><br/>
              <span className="text-[10px] opacity-60">* 본 테스트는 재미를 위한 것이며 실제 청렴도와는 아무런 상관이 없습니다.</span>
            </p>
          </div>
        )}
      </main>

      <footer className="mt-12 text-slate-400 text-xs text-center">
        <p>© 2026 관상 청렴도 연구소. All rights reserved.</p>
      </footer>
    </div>
  );
}
