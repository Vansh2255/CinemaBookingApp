import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { api, getErrorMessage } from './api'
import './styles.css'

const money = (value) => `₹${Number(value || 0).toFixed(2)}`
const fmtDate = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('cinema_user') || 'null'))
  const [token, setToken] = useState(() => localStorage.getItem('cinema_access_token'))
  const [page, setPage] = useState('home')
  const [movies, setMovies] = useState([])
  const [showtimes, setShowtimes] = useState([])
  const [bookings, setBookings] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [selectedShowtime, setSelectedShowtime] = useState(null)
  const [selectedSeat, setSelectedSeat] = useState(null)
  const [seatAvailability, setSeatAvailability] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const loggedIn = Boolean(token && user)

  const notify = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadMovies = async () => {
    if (!token) return
    setLoading(true)
    try {
      const { data } = await api.get('/api/movies', { params: { page: 1, limit: 50, sort: '-created_at' } })
      setMovies(data.movies || [])
    } catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setLoading(false) }
  }

  const loadShowtimes = async () => {
    if (!token) return
    try {
      const { data } = await api.get('/api/showtimes', { params: { page: 1, limit: 100, sort: 'start_time' } })
      setShowtimes(data.showtimes || [])
    } catch (e) { notify(getErrorMessage(e), 'error') }
  }

  const loadBookings = async () => {
    if (!token) return
    try {
      const { data } = await api.get('/api/reservations/my-bookings')
      setBookings(data.bookings || [])
    } catch (e) { notify(getErrorMessage(e), 'error') }
  }

  useEffect(() => { if (loggedIn) { loadMovies(); loadShowtimes() } }, [token])
  useEffect(() => { if (loggedIn && page === 'bookings') loadBookings() }, [page, token])

  const logout = async () => {
    try { if (token) await api.post('/api/auth/logout') } catch (_) {}
    localStorage.clear(); setToken(null); setUser(null); setPage('home'); setMovies([]); setShowtimes([]); setBookings([])
    notify('You have been logged out.')
  }

  const startBooking = async (showtime) => {
    setLoading(true)
    try {
      const { data } = await api.get(`/api/showtimes/${showtime.id}/availability`)
      setSelectedShowtime(showtime)
      setSeatAvailability(data.availability)
      setSelectedSeat(null)
      setPage('seats')
    } catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setLoading(false) }
  }

  const reserveSeat = async () => {
    if (!selectedSeat || !selectedShowtime) return
    setLoading(true)
    try {
      const { data } = await api.post('/api/reservations', {
        showtime_id: selectedShowtime.id,
        seat_id: selectedSeat.id
      })
      notify(`Seat ${selectedSeat.seatNumber} held successfully. Reservation #${data.reservation.id}`)
      setPage('bookings')
      await loadBookings()
    } catch (e) { notify(getErrorMessage(e), 'error') }
    finally { setLoading(false) }
  }

  if (!loggedIn) return <AuthScreen onLogin={(u, t) => { setUser(u); setToken(t); localStorage.setItem('cinema_user', JSON.stringify(u)); localStorage.setItem('cinema_access_token', t) }} />

  return (
    <div className="app-shell">
      <header className="navbar">
        <button className="brand" onClick={() => setPage('home')}><span>◉</span> CINEMA</button>
        <nav>
          <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>Movies</button>
          <button className={page === 'bookings' ? 'active' : ''} onClick={() => setPage('bookings')}>My Bookings</button>
        </nav>
        <div className="user-menu"><span>{user?.name}</span><button className="outline small" onClick={logout}>Logout</button></div>
      </header>

      {page === 'home' && <Home movies={movies} showtimes={showtimes} onMovie={(m) => { setSelectedMovie(m); setPage('movie') }} onBook={startBooking} loading={loading} />}
      {page === 'movie' && <MoviePage movie={selectedMovie} showtimes={showtimes.filter(s => Number(s.movieId ?? s.movie_id) === Number(selectedMovie?.id))} onBack={() => setPage('home')} onBook={startBooking} />}
      {page === 'seats' && <SeatPage showtime={selectedShowtime} availability={seatAvailability} selected={selectedSeat} setSelected={setSelectedSeat} onBack={() => setPage('movie')} onReserve={reserveSeat} loading={loading} />}
      {page === 'bookings' && <Bookings bookings={bookings} onRefresh={loadBookings} />}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  )
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      if (mode === 'signup') {
        await api.post('/api/auth/signup', form)
        setMode('login'); setError('Account created. Please sign in.')
      } else {
        const { data } = await api.post('/api/auth/login', { email: form.email, password: form.password })
        onLogin(data.user, data.accessToken)
      }
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  return <div className="auth-shell">
    <div className="auth-card">
      <div className="logo-mark">◉</div><h1>Welcome to Cinema</h1><p className="muted">Book your next movie night.</p>
      <div className="tabs"><button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Sign in</button><button className={mode === 'signup' ? 'selected' : ''} onClick={() => setMode('signup')}>Create account</button></div>
      {error && <div className="alert">{error}</div>}
      <form onSubmit={submit}>
        {mode === 'signup' && <label>Name<input required minLength="2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>}
        <label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
        <label>Password<input required minLength="6" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></label>
        <button className="primary full" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
    </div>
  </div>
}

function Home({ movies, showtimes, onMovie, onBook, loading }) {
  return <main>
    <section className="hero"><div><span className="eyebrow">NOW SHOWING</span><h1>Your cinema.<br /><em>Your seat.</em></h1><p>Explore movies, choose a showtime and reserve your seat in minutes.</p></div><div className="hero-ticket">🎬<strong>{movies.length}</strong><span>Movies available</span></div></section>
    <section className="content"><div className="section-heading"><div><span className="eyebrow">DISCOVER</span><h2>Movies</h2></div>{loading && <span className="muted">Loading…</span>}</div>
      {movies.length === 0 ? <Empty text="No movies are available yet. Add movies through the backend/admin API first." /> : <div className="movie-grid">{movies.map(m => <MovieCard key={m.id} movie={m} onClick={() => onMovie(m)} />)}</div>}
    </section>
    <section className="content"><div className="section-heading"><div><span className="eyebrow">UPCOMING</span><h2>Showtimes</h2></div></div>{showtimes.length === 0 ? <Empty text="No showtimes are available yet." /> : <div className="showtime-list">{showtimes.slice(0, 12).map(s => <ShowtimeRow key={s.id} showtime={s} onBook={onBook} />)}</div>}</section>
  </main>
}

function MovieCard({ movie, onClick }) {
  return <button className="movie-card" onClick={onClick}><div className="poster">{movie.posterUrl ? <img src={movie.posterUrl} alt="" /> : <div className="poster-fallback">▶</div>}</div><div className="movie-info"><h3>{movie.title}</h3><p>{movie.language || 'Language'} · {movie.duration ? `${movie.duration} min` : 'Runtime N/A'}</p></div></button>
}

function MoviePage({ movie, showtimes, onBack, onBook }) {
  return <main className="content narrow"><button className="back" onClick={onBack}>← Back to movies</button><div className="movie-detail"><div className="detail-poster">{movie?.posterUrl ? <img src={movie.posterUrl} alt="" /> : <div className="poster-fallback">▶</div>}</div><div><span className="eyebrow">MOVIE</span><h1>{movie?.title}</h1><p className="lead">{movie?.description || 'No description available.'}</p><div className="meta"><span>{movie?.language || '—'}</span><span>{movie?.duration ? `${movie.duration} min` : '—'}</span><span>{movie?.releaseDate ? new Date(movie.releaseDate).toLocaleDateString() : '—'}</span></div></div></div><h2 className="subheading">Choose a showtime</h2>{showtimes.length ? showtimes.map(s => <ShowtimeRow key={s.id} showtime={s} onBook={onBook} />) : <Empty text="No showtimes found for this movie." />}</main>
}

function ShowtimeRow({ showtime, onBook }) {
  const movie = showtime.movie?.title || showtime.Movie?.title
  const screen = showtime.screen?.name || showtime.Screen?.name || `Screen ${showtime.screenId ?? showtime.screen_id ?? ''}`
  return <div className="showtime-row"><div><strong>{movie || `Showtime #${showtime.id}`}</strong><span>{fmtDate(showtime.startTime || showtime.start_time)} · {screen}</span></div><div className="showtime-action"><b>{money(showtime.prices)}</b><button className="primary" onClick={() => onBook(showtime)}>Select seats</button></div></div>
}

function SeatPage({ showtime, availability, selected, setSelected, onBack, onReserve, loading }) {
  const seats = availability?.seats || availability?.availableSeats || availability?.seatAvailability || availability || []
  const booked = new Set((availability?.bookedSeats || []).map(x => Number(x.id ?? x.seatId ?? x.seat_id ?? x)))
  const list = Array.isArray(seats) ? seats : []
  const grouped = useMemo(() => list.reduce((acc, s) => { const row = String(s.seatNumber || s.seat_number || '').replace(/\d/g, '') || 'A'; (acc[row] ||= []).push(s); return acc }, {}), [list])
  return <main className="content narrow"><button className="back" onClick={onBack}>← Back</button><div className="section-heading"><div><span className="eyebrow">SELECT YOUR SEAT</span><h2>Screen selection</h2><p className="muted">{fmtDate(showtime?.startTime || showtime?.start_time)} · {money(showtime?.prices)} per seat</p></div></div><div className="screen-label">SCREEN</div><div className="seat-map">{Object.entries(grouped).map(([row, rowSeats]) => <div className="seat-row" key={row}><span>{row}</span>{rowSeats.map(seat => { const id = Number(seat.id); const isBooked = booked.has(id) || seat.status === 'BOOKED' || seat.isAvailable === false; const isSelected = selected?.id === seat.id; return <button key={seat.id} disabled={isBooked} className={`seat ${isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => setSelected(isSelected ? null : seat)}>{String(seat.seatNumber || seat.seat_number || seat.id).replace(/^.*?([0-9]+)$/, '$1')}</button> })}</div>)}</div>{!list.length && <Empty text="The backend did not return a seat list for this showtime. Check the API availability response." />}<div className="legend"><span><i className="seat-dot available" /> Available</span><span><i className="seat-dot selected-dot" /> Selected</span><span><i className="seat-dot booked-dot" /> Booked</span></div>{selected && <div className="booking-bar"><div><span>Selected seat</span><strong>{selected.seatNumber || selected.seat_number}</strong></div><div><span>Price</span><strong>{money(showtime?.prices)}</strong></div><button className="primary" disabled={loading} onClick={onReserve}>{loading ? 'Reserving…' : 'Reserve seat'}</button></div>}</main>
}

function Bookings({ bookings, onRefresh }) {
  return <main className="content narrow"><div className="section-heading"><div><span className="eyebrow">YOUR ACCOUNT</span><h2>My bookings</h2></div><button className="outline" onClick={onRefresh}>Refresh</button></div>{bookings.length === 0 ? <Empty text="You don't have any bookings yet." /> : <div className="booking-list">{bookings.map(b => <div className="booking-card" key={b.id}><div><span className="eyebrow">RESERVATION #{b.id}</span><h3>{b.movie?.title || b.showtime?.movie?.title || `Showtime #${b.showtimeId}`}</h3><p>{b.seat?.seatNumber || b.seat?.seat_number ? `Seat ${b.seat?.seatNumber || b.seat?.seat_number}` : ''} · {b.status}</p></div><div className="booking-price">{money(b.finalAmount ?? b.final_amount ?? b.baseAmount ?? b.base_amount)}</div></div>)}</div>}</main>
}

function Empty({ text }) { return <div className="empty">{text}</div> }

createRoot(document.getElementById('root')).render(<App />)
