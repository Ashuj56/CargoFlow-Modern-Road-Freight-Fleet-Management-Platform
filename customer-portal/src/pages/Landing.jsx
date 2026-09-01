import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { geocodeLocation, getDrivingDistance } from '../services/geo';

export default function Landing() {
  const navigate = useNavigate();

  // Quick Tracking Bar state
  const [quickTrackRef, setQuickTrackRef] = useState('');
  const [trackError, setTrackError] = useState('');

  // Hero Live Estimator state
  const [calcForm, setCalcForm] = useState({
    pickup: 'Mumbai',
    dest: 'Bangalore',
    cargo: 'Machinery',
  });
  const [calcResult, setCalcResult] = useState({
    distanceKm: 984,
    durationHours: 15.2,
    approxCostINR: '₹42,000 - ₹48,000',
    loading: false,
  });

  // Persona Switcher state
  const [personaTab, setPersonaTab] = useState('shippers');

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState(0);

  // Handle Quick Track submission
  const handleQuickTrack = (e) => {
    e.preventDefault();
    const cleanRef = quickTrackRef.trim().toUpperCase();
    if (!cleanRef) {
      setTrackError('Please enter a tracking reference (e.g. CF-22045)');
      return;
    }
    setTrackError('');
    navigate(`/public/${cleanRef}`);
  };

  // Handle Live Distance Estimation in Hero
  const handleEstimate = async (e) => {
    e?.preventDefault();
    if (!calcForm.pickup || !calcForm.dest) return;
    setCalcResult((prev) => ({ ...prev, loading: true }));

    try {
      const [pGeo, dGeo] = await Promise.all([
        geocodeLocation(calcForm.pickup),
        geocodeLocation(calcForm.dest),
      ]);

      if (pGeo && dGeo) {
        const route = await getDrivingDistance(pGeo, dGeo);
        if (route) {
          // Approximate commercial freight cost (₹40-50 per km base estimate)
          const baseMin = Math.round(route.distanceKm * 42);
          const baseMax = Math.round(route.distanceKm * 50);
          setCalcResult({
            distanceKm: route.distanceKm,
            durationHours: route.durationHours,
            approxCostINR: `₹${baseMin.toLocaleString('en-IN')} - ₹${baseMax.toLocaleString('en-IN')}`,
            loading: false,
          });
          return;
        }
      }
    } catch (err) {
      console.warn('Estimator error:', err);
    }
    setCalcResult((prev) => ({ ...prev, loading: false }));
  };

  const faqs = [
    {
      q: 'How do I track my cargo in real time?',
      a: 'Every booked shipment receives a unique tracking reference (e.g. CF-22045). You can enter it on our public tracker anytime without logging in, or view live GPS updates on Leaflet maps inside your customer dashboard.',
    },
    {
      q: 'How are shipping rates and quotations calculated?',
      a: 'Fleet owners provide itemized, transparent quotations based on verified road distances (via OSRM road networks), vehicle capacity, cargo type, and toll tariffs with optional GST line items.',
    },
    {
      q: 'I own trucks and drivers. How do I join as a Fleet Owner?',
      a: 'You can register directly on our Fleet Operations Portal. You will be able to register your trucks, assign licensed drivers, receive inbound quote requests, and dispatch shipments with live telematics.',
    },
    {
      q: 'What compliance and delivery documents are provided?',
      a: 'CargoFlow automatically generates GST-compliant invoices, digital Proof of Delivery (e-POD), and milestone tracking audit logs upon completed delivery.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#070D18', color: '#F1F5F9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* 1. Header / Navigation */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(7, 13, 24, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #E87B2C 0%, #FF9F43 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 0 16px rgba(232, 123, 44, 0.4)' }}>
            CF
          </div>
          <span style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
            CARGO<span style={{ color: '#E87B2C' }}>FLOW</span>
          </span>
        </div>

        <nav style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }}>
          <a href="#features" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', transition: 'color 0.2s' }}>Features</a>
          <a href="#estimator" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', transition: 'color 0.2s' }}>Route Estimator</a>
          <a href="#how" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', transition: 'color 0.2s' }}>How It Works</a>
          <a href="#faq" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', transition: 'color 0.2s' }}>FAQ</a>
        </nav>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a
            href="http://localhost:3001"
            className="btn btn-sm"
            style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#CBD5E1', borderRadius: 6 }}
          >
            Fleet Portal ⛟
          </a>
          <Link to="/login" className="btn btn-outline btn-sm" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            Sign In
          </Link>
          <Link to="/register" className="btn btn-primary btn-sm" style={{ background: '#E87B2C', border: 'none', fontWeight: 600, boxShadow: '0 0 12px rgba(232, 123, 44, 0.35)' }}>
            Get Started Free
          </Link>
        </div>
      </header>

      {/* 2. Hero Section with Quick Track & Dynamic Two-Column Showcase */}
      <section
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37, 99, 235, 0.18) 0%, rgba(232, 123, 44, 0.12) 40%, #070D18 100%)',
          padding: '4.5rem 2rem 5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          
          {/* Top Tag & Main Headline */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(232, 123, 44, 0.12)', border: '1px solid rgba(232, 123, 44, 0.3)', padding: '0.35rem 0.9rem', borderRadius: 100, color: '#FF9F43', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1.25rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E87B2C', boxShadow: '0 0 8px #E87B2C' }} />
              Live Highway Telematics & Free Dynamic Routing
            </div>
            <h1 style={{ fontSize: '3.25rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, color: '#FFFFFF', maxWidth: 850, margin: '0 auto 1.25rem' }}>
              The Intelligent Operating System for <span style={{ background: 'linear-gradient(135deg, #FF9F43 0%, #E87B2C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Road Freight</span>
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '1.15rem', maxWidth: 680, margin: '0 auto 2rem', lineHeight: 1.6 }}>
              Connect directly with verified fleet operators, calculate real highway road distances, track live GPS milestones, and automate GST invoices seamlessly.
            </p>

            {/* Quick Track Input Bar */}
            <form onSubmit={handleQuickTrack} style={{ maxWidth: 580, margin: '0 auto', display: 'flex', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '0.4rem 0.5rem 0.4rem 1rem', borderRadius: 10, backdropFilter: 'blur(12px)', boxShadow: '0 12px 30px rgba(0,0,0,0.4)' }}>
              <span style={{ display: 'flex', alignItems: 'center', color: '#64748B', fontSize: '1.1rem' }}>🔍</span>
              <input
                type="text"
                placeholder="Paste Tracking Ref (e.g. CF-22045)..."
                value={quickTrackRef}
                onChange={(e) => setQuickTrackRef(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0.65rem 1.25rem', fontWeight: 600, background: '#E87B2C', border: 'none' }}>
                Track Live ➔
              </button>
            </form>
            {trackError && <div style={{ color: '#F87171', fontSize: '0.82rem', marginTop: '0.5rem' }}>{trackError}</div>}
          </div>

          {/* Two Columns: Live Estimator (Left) + Glassmorphism Live Monitor (Right) */}
          <div id="estimator" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem', marginTop: '3.5rem' }}>
            
            {/* Left Card: Live Interactive Distance & Cost Estimator */}
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: '1.75rem', backdropFilter: 'blur(16px)', boxShadow: '0 20px 40px rgba(0,0,0,0.45)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>📍 Route & Rate Estimator</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.2rem 0 0' }}>Real-time highway calculations via OpenStreetMap & OSRM</p>
                </div>
                <span className="badge b-in_transit" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#60A5FA', border: '1px solid rgba(37, 99, 235, 0.3)' }}>Live API</span>
              </div>

              <form onSubmit={handleEstimate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>PICKUP CITY</label>
                    <input
                      type="text"
                      value={calcForm.pickup}
                      onChange={(e) => setCalcForm({ ...calcForm, pickup: e.target.value })}
                      placeholder="e.g. Mumbai"
                      style={{ width: '100%', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#F8FAFC', padding: '0.55rem 0.75rem', borderRadius: 8, fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>DESTINATION CITY</label>
                    <input
                      type="text"
                      value={calcForm.dest}
                      onChange={(e) => setCalcForm({ ...calcForm, dest: e.target.value })}
                      placeholder="e.g. Bangalore"
                      style={{ width: '100%', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#F8FAFC', padding: '0.55rem 0.75rem', borderRadius: 8, fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button type="submit" className="btn btn-outline btn-sm" disabled={calcResult.loading} style={{ flex: 1, borderColor: 'rgba(232, 123, 44, 0.5)', color: '#FF9F43', padding: '0.6rem' }}>
                    {calcResult.loading ? 'Computing Route...' : '⚡ Calculate Real Distance'}
                  </button>
                </div>
              </form>

              {/* Result Preview Box */}
              <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(30, 41, 59, 0.4)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Highway Distance:</span>
                  <strong style={{ color: '#F8FAFC', fontSize: '0.95rem' }}>{calcResult.distanceKm.toLocaleString('en-IN')} km</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Estimated Transit:</span>
                  <strong style={{ color: '#60A5FA', fontSize: '0.95rem' }}>~{calcResult.durationHours} hrs ({calcResult.durationHours >= 24 ? `${(calcResult.durationHours / 24).toFixed(1)} days` : 'Same/Next Day'})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Est. Freight Bracket:</span>
                  <strong style={{ color: '#E87B2C', fontSize: '1.05rem', fontWeight: 700 }}>{calcResult.approxCostINR}</strong>
                </div>
              </div>

              <Link to="/register" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', background: '#E87B2C', border: 'none', textAlign: 'center', display: 'block', fontWeight: 600, padding: '0.75rem' }}>
                Book This Route ➔
              </Link>
            </div>

            {/* Right Card: Live Active Shipment Telematics Preview */}
            <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: '1.75rem', backdropFilter: 'blur(16px)', boxShadow: '0 20px 40px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16A34A', boxShadow: '0 0 10px #16A34A' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4ADE80', letterSpacing: '0.04em' }}>LIVE TELEMATICS</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'monospace' }}>REF: CF-22045</span>
                </div>

                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.25rem' }}>
                  Mumbai (JNPT) ➔ Pune (Chakan MIDC)
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
                  Industrial Machinery • 8,500 kg • Heavy Container
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.35rem' }}>
                    <span>In Transit (Expressway NH-48)</span>
                    <strong style={{ color: '#E87B2C' }}>84% Completed</strong>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '84%', height: '100%', background: 'linear-gradient(90deg, #2563EB 0%, #E87B2C 100%)', borderRadius: 4 }} />
                  </div>
                </div>

                {/* Truck & Driver Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>ASSIGNED TRUCK</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>MH-12-QZ-4491</div>
                  </div>
                  <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>DRIVER TELEMATICS</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>Rajesh S. (Verified)</div>
                  </div>
                </div>

                {/* Milestone events */}
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '0.75rem', borderRadius: 8, borderLeft: '3px solid #16A34A', fontSize: '0.8rem', color: '#CBD5E1' }}>
                  📍 <strong>Recent Milestone:</strong> Departed Khalapur Toll Plaza • ETA 1 hr 15 mins
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                <Link to="/public/CF-22045" className="btn btn-outline btn-sm" style={{ flex: 1, borderColor: 'rgba(255,255,255,0.15)', color: '#fff', textAlign: 'center' }}>
                  View Live Map Demo 🗺️
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. Metric Counters Bar */}
      <section style={{ background: 'rgba(15, 23, 42, 0.9)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '2.5rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#E87B2C' }}>50,000+</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.25rem' }}>Tonnes of Cargo Moved</div>
          </div>
          <div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#60A5FA' }}>99.4%</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.25rem' }}>On-Time Delivery SLA</div>
          </div>
          <div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#4ADE80' }}>&lt; 15 Mins</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.25rem' }}>Average Quotation Speed</div>
          </div>
          <div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#F8FAFC' }}>100%</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.25rem' }}>GST & e-Way Bill Compliant</div>
          </div>
        </div>
      </section>

      {/* 4. Persona Switcher (For Shippers vs For Fleet Owners) */}
      <section id="features" style={{ padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.75rem' }}>Built for the Entire Logistics Ecosystem</h2>
          <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: 540, margin: '0 auto 1.5rem' }}>
            Choose your profile to see tailored workflows designed specifically for your freight operations.
          </p>

          <div style={{ display: 'inline-flex', background: 'rgba(30, 41, 59, 0.6)', padding: '0.35rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setPersonaTab('shippers')}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: 8,
                border: 'none',
                background: personaTab === 'shippers' ? '#E87B2C' : 'transparent',
                color: personaTab === 'shippers' ? '#fff' : '#94A3B8',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
            >
              🏢 For Shippers & Enterprises
            </button>
            <button
              onClick={() => setPersonaTab('owners')}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: 8,
                border: 'none',
                background: personaTab === 'owners' ? '#E87B2C' : 'transparent',
                color: personaTab === 'owners' ? '#fff' : '#94A3B8',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
            >
              🚚 For Fleet & Truck Owners
            </button>
          </div>
        </div>

        {personaTab === 'shippers' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: '📋', title: 'Instant Itemized Quotes', desc: 'Submit pickup & cargo specifications and receive transparent line-item pricing from certified owners.' },
              { icon: '🛰️', title: 'Live GPS Highway Telematics', desc: 'Monitor truck movement on interactive Leaflet maps with live distance & milestone alerts.' },
              { icon: '📄', title: 'Automated GST Invoicing', desc: 'Download GST-compliant invoices and digital proof of delivery (e-POD) the moment cargo arrives.' },
              { icon: '💳', title: 'Flexible Settlement', desc: 'View complete billing records, outstanding dues, and bank/UPI payment reconciliations.' },
            ].map((f, i) => (
              <div key={i} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: '1.75rem', backdropFilter: 'blur(12px)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: '🚛', title: 'Fleet & Driver Dispatch', desc: 'Manage your entire fleet capacity, assign licensed drivers, and keep trucks moving at maximum utilization.' },
              { icon: '📥', title: 'Direct Inbound Shipment Leads', desc: 'Receive validated freight booking requests directly from commercial shippers without broker middlemen.' },
              { icon: '⚡', title: 'One-Click Quotation Builder', desc: 'Generate professional quotations with configurable GST rates, transport charges, and validity windows.' },
              { icon: '📊', title: 'Revenue & Operations Reports', desc: 'Track total monthly collected revenue, active fleet status, and delivery completion ratios in real time.' },
            ].map((f, i) => (
              <div key={i} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: '1.75rem', backdropFilter: 'blur(12px)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. 4-Step Interactive Process Flow */}
      <section id="how" style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>How CargoFlow Works</h2>
            <p style={{ color: '#94A3B8', fontSize: '1rem', marginTop: '0.5rem' }}>End-to-end execution in four straightforward steps</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {[
              { step: '01', title: 'Post Shipment', desc: 'Specify pickup/destination cities, weight, and cargo type with live distance calculation.' },
              { step: '02', title: 'Review Quote', desc: 'Get competitive line-item quotes from fleet owners and accept in one click.' },
              { step: '03', title: 'Track Live GPS', desc: 'Follow truck coordinates, speed, and milestone timestamps in real time.' },
              { step: '04', title: 'Deliver & Invoice', desc: 'Receive automatic digital proof-of-delivery (e-POD) and instant GST invoice download.' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.5rem', position: 'relative' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#E87B2C', opacity: 0.9, marginBottom: '0.75rem' }}>{s.step}</div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>{s.title}</h4>
                <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section id="faq" style={{ padding: '5rem 2rem', maxWidth: 850, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Frequently Asked Questions</h2>
          <p style={{ color: '#94A3B8', fontSize: '1rem', marginTop: '0.5rem' }}>Everything you need to know about CargoFlow</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  style={{
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: isOpen ? '#FF9F43' : '#F8FAFC',
                    fontSize: '1rem',
                  }}
                >
                  <span>{f.q}</span>
                  <span style={{ fontSize: '1.2rem', transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 1.5rem 1.25rem', color: '#94A3B8', fontSize: '0.92rem', lineHeight: 1.6 }}>
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Call To Action Banner */}
      <section style={{ background: 'linear-gradient(135deg, rgba(232, 123, 44, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '4.5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '1rem' }}>Ready to Scale Your Freight?</h2>
          <p style={{ color: '#CBD5E1', fontSize: '1.1rem', marginBottom: '2rem' }}>
            Join forward-thinking shippers and fleet owners managing logistics on CargoFlow.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg" style={{ background: '#E87B2C', border: 'none', fontWeight: 700, padding: '0.85rem 2rem' }}>
              Create Customer Account
            </Link>
            <a href="http://localhost:3001" className="btn btn-outline btn-lg" style={{ borderColor: '#fff', color: '#fff', padding: '0.85rem 2rem' }}>
              Launch Fleet Owner Portal ➔
            </a>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer style={{ background: '#050A13', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '2.5rem 2rem', color: '#64748B', fontSize: '0.85rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>CARGO<span style={{ color: '#E87B2C' }}>FLOW</span></span>
            <span style={{ marginLeft: '1rem' }}>© {new Date().getFullYear()} CargoFlow Logistics Platform.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(22, 163, 74, 0.12)', border: '1px solid rgba(22, 163, 74, 0.3)', padding: '0.3rem 0.75rem', borderRadius: 100, color: '#4ADE80', fontSize: '0.78rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', boxShadow: '0 0 6px #16A34A' }} />
            All Systems Operational (API, GPS, Sockets)
          </div>
        </div>
      </footer>

    </div>
  );
}
