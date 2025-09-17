import ConvexClientProvider from '@/components/ConvexClientProvider';
import './globals.css';
import '@uploadthing/react/styles.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { MeProvider } from '@/components/providers/me-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Rojgar - Find Your Dream Job',
  description: 'Job portal for finding the perfect job or hiring great candidates',
  keywords: 'jobs, hiring, career, employment, recruitment',
  // Provide a base to eliminate metadataBase warning in dev
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Rojgar - Find Your Dream Job',
    description: 'Job portal for finding the perfect job or hiring great candidates',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={
          inter.className +
          ' bg-primary text-white h-screen relative overflow-x-hidden'
        }
      >
        <ConvexClientProvider>
          <MeProvider>
          <main className="h-screen flex flex-col items-center justify-center">
              <div className="fixed inset-0 -z-10">
              <img
                src="/bg.png"
                alt="Background"
                className="w-full h-full object-cover"
              />
              </div>
            <div
              className="w-full max-w-md sm:max-w-sm md:max-w-md lg:max-w-md xl:max-w-md 2xl:max-w-md px-4 sm:px-6 md:px-8 {py-2 sm:py-4} mx-auto h-screen flex flex-col bg-transparent"
              style={{ minHeight: '100dvh' }}
            >
              {children}
            </div>
          </main>
          </MeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}