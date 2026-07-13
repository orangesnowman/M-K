import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout } from './services/firebaseAuth';
import { WorkspaceResources, RoutingConfiguration } from './types';
import AppsScriptViewer from './components/AppsScriptViewer';
import FeedbackPipelineSetup from './components/FeedbackPipelineSetup';
import PipelineSandbox from './components/PipelineSandbox';
import mkLogo from './assets/images/mk_logo_1781902335896.jpg';
import {
  Sparkles,
  Sheet,
  FileCheck,
  Mail,
  GitFork,
  ArrowRight,
  Info,
  Layers,
  Code2,
  Terminal,
  Activity,
  UserCheck,
  Play,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Database
} from 'lucide-react';

const defaultRoutingConfig = (userEmail: string = ''): RoutingConfiguration => ({
  supportEmail: userEmail || 'support@yourcompany.com',
  googleReviewsUrl: 'https://g.page/r/CajrrF4R_V20EAI/review',
  excellentSubject: 'Your feedback means the world to us, ${name}! 🌟',
  excellentBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
  <h2 style="color: #dc2626; margin-top: 0; font-size: 20px; font-weight: 700;">🌟 Outstanding, thank you \${name}!</h2>
  <p>Hi <strong>\${name}</strong>,</p>
  <p>Thank you so much for taking the time to share your feedback. We are absolutely thrilled to receive your <strong>5-Star rating!</strong> Your kind comments keep our team motivated:</p>
  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 18px; margin: 18px 0; border-radius: 4px; color: #7f1d1d; font-style: italic;">
    "\${comments}"
  </div>
  <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
  <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Warmest regards,<br/><strong>The M&K Customer Team</strong></p>
</div>`,
  goodSubject: 'We value your input, ${name}!  🌟',
  goodBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
  <h2 style="color: #dc2626; margin-top: 0; font-size: 20px; font-weight: 700;">🌟 Wonderful! Thank you, \${name}</h2>
  <p>Hi <strong>\${name}</strong>,</p>
  <p>We saw that you gave us a <strong>4-Star rating</strong>. Thank you so much for your support! We are constantly working to improve, and your comments are invaluable:</p>
  <div style="background: #fffbeb; border-left: 4px solid #fbbf24; padding: 12px 18px; margin: 18px 0; border-radius: 4px; color: #78350f; font-style: italic;">
    "\${comments}"
  </div>
  <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
  <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Warmest regards,<br/><strong>The M&K Customer Team</strong></p>
</div>`,

  neutralSubject: 'Regarding your recent experience, ${name}',
  neutralBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
  <h2 style="color: #111827; margin-top: 0; font-size: 20px; font-weight: 700;">We want to make this right</h2>
  <p>Hi <strong>\${name}</strong>,</p>
  <p>Thank you for submitting your <strong>3-Star rating</strong> feedback. We appreciate you reaching out, but we are sorry that we only delivered a satisfactory experience, rather than a perfect one.</p>
  <p>We have captured your comments:</p>
  <div style="background: #f3f4f6; border-left: 4px solid #374151; padding: 12px 18px; margin: 18px 0; border-radius: 4px; color: #111827; font-style: italic;">
    "\${comments}"
  </div>
  <p>What can we do to make your next experience a perfect 5 stars? Simply respond directly to this email to start a conversation with a service supervisor.</p>
  <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
  <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Warm regards,<br/><strong>Support Management</strong></p>
</div>`,

  poorSubject: '${name} We are concern regarding your recent experience',
  poorBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; border-top: 4px solid #dc2626;">
  <h2 style="color: #dc2626; margin-top: 0; font-size: 20px; font-weight: 700;">A Sincere Apology</h2>
  <p>Dear <strong>\${name}</strong>,</p>
  <p>Thank you for taking the time to share your review. We were very distressed to see your <strong>\${rating} rating</strong> and read about your recent experience:</p>
  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 18px; margin: 18px 0; border-radius: 4px; color: #991b1b; font-style: italic;">
    "\${comments}"
  </div>
  <p>This falls completely short of our company core standards. We would love to make this right for you as soon as possible.</p>
  <p>Can you please reply to this email, or let us know a convenient time to schedule a phone call? We would appreciate the opportunity to listen to your concerns and seek a resolution.</p>
  <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
  <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">With high concern,<br/><strong>Alex Carter</strong><br/>Global CX Director</p>
</div>`,
  starThreshold: 3,
  yelpEnabled: true,
  yelpUrl: 'https://www.yelp.com/biz/m-and-k-used-auto-parts-vero-beach-2',
  facebookEnabled: true,
  facebookUrl: 'https://www.facebook.com/MKusedautoparts/reviews',
  bbbEnabled: false,
  bbbUrl: 'https://www.bbb.org'
});

const isPublished = () => {
  try {
    const hostname = window.location.hostname;
    return hostname.includes('-pre-') || (!hostname.includes('-dev-') && hostname !== 'localhost' && hostname !== '127.0.0.1');
  } catch {
    return false;
  }
};

export default function App() {
  const [forceLivePreview, setForceLivePreview] = useState(() => {
    try {
      return localStorage.getItem('g_force_live_preview') === 'true';
    } catch {
      return false;
    }
  });

  const getPublishedState = () => {
    if (forceLivePreview) return true;
    return isPublished();
  };

  const [activeTab, setActiveTab] = useState<'blueprint' | 'script' | 'sandbox'>(() => {
    try {
      if (getPublishedState()) {
        return 'sandbox';
      }
      return (localStorage.getItem('g_active_tab') as any) || 'blueprint';
    } catch {
      return 'blueprint';
    }
  });
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [resources, setResources] = useState<WorkspaceResources>(() => {
    try {
      const saved = localStorage.getItem('g_resources');
      const defaultResources = {
        spreadsheetId: '1NFtZc8tbp3DCOT4JKze7b7np3iB8kjgBRsvXc4X5lQ4',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1NFtZc8tbp3DCOT4JKze7b7np3iB8kjgBRsvXc4X5lQ4/edit?usp=sharing',
        formId: null,
        formUrl: null
      };
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultResources,
          ...parsed,
          spreadsheetId: parsed.spreadsheetId || defaultResources.spreadsheetId,
          spreadsheetUrl: parsed.spreadsheetUrl || defaultResources.spreadsheetUrl,
        };
      }
      return defaultResources;
    } catch {
      return {
        spreadsheetId: '1NFtZc8tbp3DCOT4JKze7b7np3iB8kjgBRsvXc4X5lQ4',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1NFtZc8tbp3DCOT4JKze7b7np3iB8kjgBRsvXc4X5lQ4/edit?usp=sharing',
        formId: null,
        formUrl: null
      };
    }
  });

  const [routingConfig, setRoutingConfig] = useState<RoutingConfiguration>(() => {
    try {
      const saved = localStorage.getItem('g_routing_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          !parsed.googleReviewsUrl || 
          parsed.googleReviewsUrl.includes('maps.app.goo.gl') ||
          parsed.goodSubject === 'We value your input, ${name}! Here is a little thank-you 🎁' ||
          parsed.poorSubject === 'An apology and concern regarding your recent order' ||
          parsed.poorSubject === '${name} We are concern regarding your recent order' ||
          (parsed.excellentBody && parsed.excellentBody.includes('Submit Review')) ||
          (parsed.excellentBody && parsed.excellentBody.includes('Share Your Review')) ||
          (parsed.excellentBody && parsed.excellentBody.includes('sharing your review')) ||
          (parsed.excellentBody && !parsed.excellentBody.includes('googleReviewsUrl')) || 
          (parsed.excellentBody && (parsed.excellentBody.includes('Outstanding!') || parsed.excellentBody.includes('thank you,')))
        ) {
          const fresh = defaultRoutingConfig(parsed.supportEmail || '');
          localStorage.setItem('g_routing_config', JSON.stringify(fresh));
          return fresh;
        }
        const merged = {
          ...defaultRoutingConfig(parsed.supportEmail || ''),
          ...parsed
        };
        if (merged.yelpUrl === 'https://www.yelp.com') {
          merged.yelpUrl = 'https://www.yelp.com/biz/m-and-k-used-auto-parts-vero-beach-2';
        }
        if (merged.facebookUrl === 'https://www.facebook.com' || !merged.facebookUrl) {
          merged.facebookUrl = 'https://www.facebook.com/MKusedautoparts/reviews';
        }
        return merged;
      }
      return defaultRoutingConfig();
    } catch {
      return defaultRoutingConfig();
    }
  });

  // Keep state synchronized with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('g_active_tab', activeTab);
    } catch (e) {
      console.warn(e);
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('g_resources', JSON.stringify(resources));
    } catch (e) {
      console.warn(e);
    }
  }, [resources]);

  useEffect(() => {
    try {
      localStorage.setItem('g_routing_config', JSON.stringify(routingConfig));
    } catch (e) {
      console.warn(e);
    }
  }, [routingConfig]);

  useEffect(() => {
    // Listen for Firebase auth state and parse cached tokens if user is already signed in
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        if (accessToken) {
          setToken(accessToken);
        }
        // Prepopulate support email to the user's Google email automatically but preserve other configs
        setRoutingConfig((prev) => {
          const updated = { ...prev };
          if (!updated.supportEmail || updated.supportEmail === 'support@yourcompany.com') {
            updated.supportEmail = currentUser.email || 'support@yourcompany.com';
          }
          return updated;
        });
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setRoutingConfig((prev) => {
          const updated = { ...prev };
          if (!updated.supportEmail || updated.supportEmail === 'support@yourcompany.com') {
            updated.supportEmail = result.user.email || 'support@yourcompany.com';
          }
          return updated;
        });
      }
    } catch (err: any) {
      console.error('Google authorization error:', err);
      if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup')) {
        setAuthError('OAuth Popup blocked by browser policy. To resolve, click the "Open in New Tab" link below, or enable popups for this site in your browser search/address bar.');
      } else {
        setAuthError(err?.message || 'Failed to authenticate Google Account.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setAuthError(null);
    setResources({
      spreadsheetId: '1NFtZc8tbp3DCOT4JKze7b7np3iB8kjgBRsvXc4X5lQ4',
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1NFtZc8tbp3DCOT4JKze7b7np3iB8kjgBRsvXc4X5lQ4/edit?usp=sharing',
      formId: null,
      formUrl: null
    });
    try {
      localStorage.removeItem('g_resources');
      localStorage.removeItem('g_routing_config');
      localStorage.removeItem('g_active_tab');
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className={`min-h-screen text-slate-800 font-sans tracking-normal selection:bg-slate-200 ${getPublishedState() ? 'bg-white' : 'bg-slate-100'}`}>
      
      {/* Decorative gradient top bar */}
      {!getPublishedState() && <div className="h-1.5 w-full bg-gradient-to-r from-red-650 via-slate-700 to-black"></div>}

      {/* Main Header Container */}
      {getPublishedState() ? (
        <header className="bg-white pt-4 pb-0.5 shadow-none">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-row items-center gap-5">
            {/* Brand Logo */}
            <div className="shrink-0 select-none bg-white p-0 m-0 overflow-hidden h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center rounded-none ml-[-8px] sm:ml-[-4px]">
              <img
                src={mkLogo}
                alt="M&K Logo"
                className="h-28 w-28 sm:h-32 sm:w-32 object-contain mix-blend-multiply scale-[1.35] transform-gpu"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Title & Subtitle */}
            <div className="flex-1">
              <h1 className="text-[1.125rem] sm:text-[1.35rem] font-semibold text-[#dc2626] tracking-[0.02em] leading-none text-left">
                Customer Feedback
              </h1>
              <p className="text-[0.7875rem] text-[#dc2626] mt-0.5 max-w-3xl leading-none text-left font-medium">
                We value your experience!
              </p>
            </div>
          </div>
        </header>
      ) : (
        /* Original Main Header Container with Simplified Agile Layout */
        <header className="bg-slate-950 border-b border-slate-900 py-5 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Title, Consolidated Description & Minimal Process flow */}
              <div>
                {/* Horizontal Modern Flow Indicators */}
                <div className="flex items-center gap-2.5 overflow-x-auto pb-4 pt-1 px-1 max-w-full -mx-4 sm:-mx-0 scrollbar-none shrink-0 mb-6">
                  {/* Step 1: Authorized */}
                  {user && token ? (
                    <div className="bg-[#0c101d] border border-slate-800/90 rounded-2xl p-3 flex items-center gap-3.5 min-w-[210px] shrink-0 transition-all duration-200">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5.5 h-5.5" />
                      </div>
                      <div className="flex flex-col text-left justify-center select-none">
                        <span className="text-[13px] font-bold text-slate-100 tracking-wide">Authorized</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Active</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      type="button"
                      className="bg-[#0c101d] border border-slate-800/90 hover:border-red-500/50 hover:bg-slate-900/40 rounded-2xl p-3 flex items-center gap-3.5 min-w-[210px] shrink-0 transition-all duration-200 cursor-pointer text-left outline-none focus:outline-hidden"
                      title="Connect Google Account"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        {isLoggingIn ? (
                          <div className="w-4.5 h-4.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <ShieldAlert className="w-5.5 h-5.5" />
                        )}
                      </div>
                      <div className="flex flex-col text-left justify-center">
                        <span className="text-[13px] font-bold text-slate-300 tracking-wide group-hover:text-white">Connect Google</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pending</span>
                        </div>
                      </div>
                    </button>
                  )}

                  <ArrowRight className="w-4 h-4 text-slate-700 shrink-0" />

                  {/* Step 2: Live App */}
                  <div className="bg-[#0c101d] border border-slate-800/90 rounded-2xl p-3 flex items-center gap-3.5 min-w-[210px] shrink-0 transition-all duration-200">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                      <Smartphone className="w-5.5 h-5.5" />
                    </div>
                    <div className="flex flex-col text-left justify-center select-none">
                      <span className="text-[13px] font-bold text-slate-100 tracking-wide">Live App</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Online</span>
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-700 shrink-0" />

                  {/* Step 3: Sheet Feedback */}
                  <div className="bg-[#0c101d] border border-slate-800/90 rounded-2xl p-3 flex items-center gap-3.5 min-w-[210px] shrink-0 transition-all duration-200">
                    {resources.spreadsheetId ? (
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                        <Database className="w-5.5 h-5.5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                        <Database className="w-5.5 h-5.5" />
                      </div>
                    )}
                    <div className="flex flex-col text-left justify-center select-none">
                      <span className="text-[13px] font-bold text-slate-100 tracking-wide">Sheet Feedback</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {resources.spreadsheetId ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Connected</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pending</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-700 shrink-0" />

                  {/* Step 4: Routing Split */}
                  <div className="bg-[#0c101d] border border-slate-800/90 rounded-2xl p-3 flex items-center gap-3.5 min-w-[210px] shrink-0 transition-all duration-200">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <GitFork className="w-5.5 h-5.5" />
                    </div>
                    <div className="flex flex-col text-left justify-center select-none">
                      <span className="text-[13px] font-bold text-slate-100 tracking-wide">Routing Split</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Active</span>
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-700 shrink-0" />

                  {/* Step 5: Automated Gmail */}
                  <div className="bg-[#0c101d] border border-slate-800/90 rounded-2xl p-3 flex items-center gap-3.5 min-w-[210px] shrink-0 transition-all duration-200">
                    {user && token ? (
                      <div className="w-10 h-10 rounded-xl bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] flex items-center justify-center shrink-0">
                        <Mail className="w-5.5 h-5.5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                        <Mail className="w-5.5 h-5.5" />
                      </div>
                    )}
                    <div className="flex flex-col text-left justify-center select-none">
                      <span className="text-[13px] font-bold text-slate-100 tracking-wide">Automated Gmail</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {user && token ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Ready</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Setup Pending</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-1">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                      MandK App
                    </h1>
                    <p className="text-xs text-white mt-1.5 max-w-2xl leading-relaxed">
                      Design automated workflows: Collect submissions via the Live App, log them in Google Sheets, and route optimized email notifications via Gmail Apps Script.
                    </p>

                    {/* Incorporated Live Preview Switcher */}
                    {!isPublished() && (
                      <div className="mt-3.5 flex items-center gap-3 text-white w-fit">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Live Preview:</span>
                          <span className="text-xs font-bold text-slate-300">INACTIVE (Dev View)</span>
                        </div>
                        <div className="h-4 w-[1px] bg-slate-800"></div>
                        <button
                          onClick={() => {
                            setForceLivePreview(true);
                            try {
                              localStorage.setItem('g_force_live_preview', 'true');
                            } catch (e) {
                              console.warn(e);
                            }
                            setActiveTab('sandbox');
                          }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-extrabold bg-slate-800 hover:bg-slate-700 text-slate-205 active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-1 select-none"
                        >
                          Simulate Customer View 👁️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Dynamic Workflow Interface */}
      <main className={`${getPublishedState() ? 'max-w-2xl mt-1 pb-8' : 'max-w-7xl mt-8 pb-20'} mx-auto px-4 sm:px-6 lg:px-8`}>
        
        {/* Navigation Tabs */}
        {!getPublishedState() && (
          <div className="border-b border-slate-200 mb-8 overflow-hidden">
            <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none w-full -mb-[1px] pb-1">
              <button
                onClick={() => setActiveTab('blueprint')}
                className={`pb-3 px-3.5 text-sm font-bold border-b-2 flex items-center gap-2.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'blueprint'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                id="tab-blueprint"
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border transition-colors ${
                  activeTab === 'blueprint'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  1
                </span>
                <span>Sheet Feedback</span>
              </button>

              <button
                onClick={() => setActiveTab('script')}
                className={`pb-3 px-3.5 text-sm font-bold border-b-2 flex items-center gap-2.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'script'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                id="tab-script"
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border transition-colors ${
                  activeTab === 'script'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  2
                </span>
                <span>Apps Script Generator</span>
              </button>

              <button
                onClick={() => setActiveTab('sandbox')}
                className={`pb-3 px-3.5 text-sm font-bold border-b-2 flex items-center gap-2.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'sandbox'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                id="tab-sandbox"
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border transition-colors ${
                  activeTab === 'sandbox'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  3
                </span>
                <span>Input Simulator</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Tab Panes */}
        <div>
          {activeTab === 'blueprint' && (
            <FeedbackPipelineSetup
              user={user}
              token={token}
              resources={resources}
              onResourcesChange={setResources}
              onLogin={handleLogin}
              onLogout={handleLogout}
              isLoggingIn={isLoggingIn}
              authError={authError}
            />
          )}

          {activeTab === 'script' && (
            <AppsScriptViewer
              routingConfig={routingConfig}
              onConfigChange={setRoutingConfig}
            />
          )}

          {activeTab === 'sandbox' && (
            <PipelineSandbox
              token={token}
              resources={resources}
              routingConfig={routingConfig}
              onLogin={handleLogin}
              isLoggingIn={isLoggingIn}
              user={user}
              onLogout={handleLogout}
              isLivePreview={getPublishedState()}
              authError={authError}
            />
          )}
        </div>
      </main>

      {/* Return to Designer floating hub (Only visible when simulating Customer View in Dev mode) */}
      {!isPublished() && forceLivePreview && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-slate-900/95 border border-slate-800 text-white rounded-full shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-350">Live Preview:</span>
            <span className="text-xs font-bold text-white">ACTIVE (Customer View)</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-800"></div>
          <button
            onClick={() => {
              setForceLivePreview(false);
              try {
                localStorage.setItem('g_force_live_preview', 'false');
              } catch (e) {
                console.warn(e);
              }
            }}
            className="px-4 py-1.5 rounded-full text-[11.5px] font-extrabold bg-red-650 hover:bg-red-750 text-white shadow-xs active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-1.5 select-none"
          >
            Return to Designer 🛠️
          </button>
        </div>
      )}
    </div>
  );
}
