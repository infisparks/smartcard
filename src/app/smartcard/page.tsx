'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getAuth } from 'firebase/auth';
import { firebaseApp } from '../../firebaseconfig';

// Dynamically import QRCode and extract its default export so it's only loaded on the client.
const QRCode = dynamic(
  () => import('qrcode.react').then((mod) => mod.default),
  { ssr: false }
);

export default function SmartCardPage() {
  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const [userData, setUserData] = useState<{ uid: string; name: string | null } | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserData({ uid: user.uid, name: user.displayName });
    } else {
      // Redirect to login if no user is found
      router.push('/login');
    }
  }, [auth, router]);

  // Build the URL for the QR code (e.g., yourdomain.com/login/[uid])
  const cardUrl = userData ? `${window.location.origin}/login/${userData.uid}` : '';

  // Function to download the smart card using html2canvas
  const handleDownload = async () => {
    const element = document.getElementById('smart-card');
    if (!element) return;
    const html2canvas = (await import('html2canvas')).default;
    html2canvas(element).then((canvas) => {
      const link = document.createElement('a');
      link.download = 'smartcard.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  if (!userData) return <p>Loading...</p>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      {/* Smart Card styled like a PVC/debit card */}
      <div
        id="smart-card"
        className="bg-white rounded-lg shadow-2xl p-6 flex flex-col items-center justify-center relative"
        style={{ width: '340px', height: '215px', border: '2px solid #ccc' }}
      >
        <h2 className="text-xl font-bold mb-2">{userData.name}</h2>
        <QRCode value={cardUrl} size={80} />
        <p className="text-sm mt-2">Scan to Login</p>
        <p className="absolute bottom-2 text-xs text-gray-500">{cardUrl}</p>
      </div>
      <button
        onClick={handleDownload}
        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
      >
        Download Smart Card
      </button>
    </div>
  );
}
