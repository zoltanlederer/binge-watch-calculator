import { useEffect, useState } from 'react'
import './App.css'

// A plain function, not a component — pure, reusable, no state involved
function getPosterUrl(posterPath, posterSize = 'w185'){
  const posterBaseUrl = 'https://image.tmdb.org/t/p/'
  return posterPath
    ? `${posterBaseUrl}${posterSize}${posterPath}`
    : '/images/poster-placeholder.png'
}

// Sums every episode's runtime across every season into one total.
// Nested reduce: outer loop walks seasons, inner loop sums that season's episodes.
function getTotalRuntimeMinutes(seasonsData){
  return seasonsData.reduce((total, season) => {
    const seasonMinutes = season.episodes.reduce((sum, episode) => {
      return sum + episode.runtime
    }, 0)
    return total + seasonMinutes
  }, 0)
}

function formatWatchTime(totalMinutes){
  // converts raw minutes into days/hours/minutes for display —
  // ShowDetail uses this for the "total runtime" pill, separate
  // from getDaysToFinish's personalized pace-based estimate
  const days = Math.floor(totalMinutes / 1440)
  const remainingAfterDays = totalMinutes % 1440
  const hours = Math.floor(remainingAfterDays / 60)
  const minutes = remainingAfterDays % 60
  return {days, hours, minutes}
}

// Given the total watch time and a chosen pace (hours/day), works out how
// many full days that pace takes, plus the leftover hours needed on the
// final day — rather than assuming a 24-hour day like formatWatchTime does
function getDaysToFinish(totalMinutes, hoursPerDay) {
  const totalHours = totalMinutes / 60
  // Whole days completed at this pace
  const fullDays = Math.floor(totalHours / hoursPerDay)
  // Whatever's left over doesn't fill a full day at this pace,
  // so it's shown separately as partial hours on the last day
  const remainingHours = totalHours - (fullDays * hoursPerDay)
  const hours = Math.floor(remainingHours)
  const minutes = Math.round((remainingHours - hours) * 60)
  return {fullDays, hours, minutes}
}

function SearchInput({searchValue, onSearchChange}){
  return (
    <input
      className="search-input"
      type='text'
      placeholder="Search for a tv show"
      value={searchValue}
      onChange={onSearchChange}
    />
  )
}

function ShowList({shows, onSelectedShow}){
  return (
    <ul className="results-list">
      {shows && shows.slice(0, 6).map(show => {
        return (
          <ShowListItem key={show.id} show={show} onSelectedShow={onSelectedShow} />
        )
      })}
    </ul>
  )
}

function ShowListItem({show, onSelectedShow}){
  const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : ''
  return (
    <li className="result-item" onClick={() => onSelectedShow(show)}>
      <div className="result-main">
        <img className="result-poster" src={getPosterUrl(show.poster_path)} alt={`${show.name} poster`} />
        <div className="result-text">
          <p className="result-title">{show.name}</p>
          <p className="result-year">{year}</p>
        </div>
      </div>
      <span className="result-chevron">&#8250;</span>
    </li>
  )
}

function SeasonSelect({numberOfSeasons, value, onChange}){
  // Generates one <option> per season number; onChange belongs on
  // <select> itself, not on individual <option> elements
  const options = []
  for (let i = 1; i <= numberOfSeasons; i++) {
    options.push(<option key={i} value={i}>{`Season ${i}`}</option>)
  }
  return (
    <select value={value} onChange={onChange}>
      {options}
    </select>
  )
}

function LoadingCard({text}){
  return (
    <div className="loading-card">
      <span className="spinner"></span>
      <p className="loading-text">{text}</p>
    </div>
  )
}

function ErrorCard({text}){
  return (
    <div className="error-card">
      <span className="error-icon">!</span>
      <p className="error-text">{text}</p>
    </div>
  )
}

function ShowDetail({showDetails, seasonsData, seasonsRange, onHandleFromSeason, onHandleToSeason}){
  // Lets the person set their own daily pace to see a personalized
  // "finish by" estimate, separate from the show's fixed total runtime
  const [hoursPerDay, setHoursPerDay] = useState(2)
  // Narrows seasonsData down to the selected from/to range before summing,
  // so the total reflects only the seasons the person wants to watch
  const filteredSeason = seasonsData.filter(season => {
    return season.season_number >= seasonsRange.fromSeason && season.season_number <= seasonsRange.toSeason
  })
  // Counts episodes only within the filtered range, matching the
  // season count and runtime pills so all three stay consistent
  // with whatever range the person has selected
  const filteredEpisodeCount = filteredSeason.reduce((count, season) => {
    return count + season.episodes.length
  }, 0)
  const totalMinutes = getTotalRuntimeMinutes(filteredSeason)
  const {days, hours, minutes} = formatWatchTime(totalMinutes)
  const { fullDays, hours: remainingHours, minutes: remainingMinutes } = getDaysToFinish(totalMinutes, hoursPerDay)

  const handleHoursPerDay = (e) => {
    setHoursPerDay(Number(e.target.value))
  }

  const year = showDetails.first_air_date ? new Date(showDetails.first_air_date).getFullYear() : ''

  return (
    <>
      <div className="hero-top">
        <p className="show-title">{showDetails.name}</p>
        <div className="hero-row">
          <div className="poster-wrap">
            <a href={`https://www.themoviedb.org/tv/${showDetails.id}`} target="_blank" rel="noopener noreferrer">
              <img className="poster-large" src={getPosterUrl(showDetails.poster_path)} alt={`${showDetails.name} poster`} />
            </a>
            <div className="poster-badges">
              <span className="badge rating">&#9733; {showDetails.vote_average.toFixed(1)}</span>
              <span className="badge year">{year}</span>
            </div>
          </div>
          <div className="glass-card hero-row-overview">
            <div className="hero-row-overview-inner">
              <p className="overview">{showDetails.overview}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <p className="section-label">Seasons to watch</p>
        <div className="season-selects">
          <SeasonSelect
            numberOfSeasons={showDetails.number_of_seasons}
            value={seasonsRange.fromSeason}
            onChange={onHandleFromSeason}
          />
          <span>to</span>
          <SeasonSelect
            numberOfSeasons={showDetails.number_of_seasons}
            value={seasonsRange.toSeason}
            onChange={onHandleToSeason}
          />
        </div>
      </div>

      <div className="glass-card">
        <div className="hero-number">
          <span className="hero-digits">{fullDays}<span className="hero-unit">d</span>{remainingHours}<span className="hero-unit">h</span>{remainingMinutes}<span className="hero-unit">m</span></span>
          <p className="hero-caption">at your pace &middot; {hoursPerDay} hours a day</p>
        </div>
        <div className="slider-row">
          <label>Hours a day</label>
          <input type="range" min="0.5" max="24" step="0.5" value={hoursPerDay} onChange={handleHoursPerDay} />
          <span className="hours-out">{hoursPerDay}h</span>
        </div>
        <div className="pill-row">
          <div className="pill">
            <div className="pill-value">{filteredSeason.length}</div>
            <div className="pill-label">seasons</div>
          </div>
          <div className="pill">
            <div className="pill-value">{filteredEpisodeCount}</div>
            <div className="pill-label">episodes</div>
          </div>
          <div className="pill">
            <div className="pill-value">{days}d {hours}h {minutes}m</div>
            <div className="pill-label">total runtime</div>
          </div>
        </div>
      </div>
    </>
  )
}

function App() {
  const [searchInput, setSearchInput] = useState('')
  const [matchingShow, setMatchingShow] = useState([])
  const [selectedShow, setSelectedShow] = useState(null)
  const [showDetails, setShowDetails] = useState(null)
  const [seasonsData, setSeasonsData] = useState([])
  const [seasonsRange, setSeasonsRange] = useState({fromSeason: 1, toSeason: 1})
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const tmdbBaseUrl = 'https://api.themoviedb.org/3'
  const fetchHeader = {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_TOKEN}`,
      accept: "application/json"
    }
  }

  // Refetches automatically whenever searchInput changes
  useEffect(() => {
    setLoadError(null)
    // Skip fetching for very short input, and clear old results
    // so they don't linger on screen if the search box is cleared
    if (searchInput.length < 2 ){
      setMatchingShow([])
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    setIsSearching(true)

    // Waits 500ms after the last change to searchInput before fetching,
    // so a fetch only fires once typing pauses, not on every keystroke
    const timeoutId = setTimeout(() => {
      // A fetch only rejects on true network failure — a 401/404/500 still
      // resolves successfully, so status must be checked explicitly here
      fetch(`${tmdbBaseUrl}/search/tv?query=${searchInput}`, {...fetchHeader, signal: controller.signal})
        .then(response => {
          if (!response.ok){
            throw new Error(`Search fetch failed: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          setMatchingShow(data.results)
          setIsSearching(false)
        })
        // Catches both a bad response status (thrown above) and genuine
        // network failures (fetch itself rejecting)
        .catch(() => {
          setIsSearching(false)
          setLoadError("Couldn't search right now. Try again in a moment.")
        })
    }, 500)

    // Cancels the scheduled fetch above if searchInput changes again
    // before the 500ms is up (runs before the effect re-runs, and on unmount).
    // Also aborts the fetch if it already fired, covering both points where
    // a stale search could otherwise resolve late and overwrite fresh results.
    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [searchInput])

  useEffect(() => {
    setLoadError(null)
    if (!selectedShow) { return }
    const controller = new AbortController()
    // Tracks the loading state across the whole chain: show details,
    // then all season fetches — only clears once seasonsData is ready
    setIsLoadingDetails(true)
    fetch(`${tmdbBaseUrl}/tv/${selectedShow.id}`, {...fetchHeader, signal: controller.signal})
    .then(response => {
      // Same reasoning as the search fetch — status must be checked explicitly
      if (!response.ok) {
        throw new Error(`Show fetch failed: ${response.status}`)
      }
      return response.json()
    })
    .then(data => {
      setShowDetails(data)
      // Resets the range to the full show whenever a new show is selected,
      // rather than merging with the previous show's leftover range
      setSeasonsRange({fromSeason: 1, toSeason: data.number_of_seasons})

      const fetches = []
      for(let i = 1; i <= data.number_of_seasons; i++){
        fetches.push(fetch(`${tmdbBaseUrl}/tv/${selectedShow.id}/season/${i}`, {...fetchHeader, signal: controller.signal}))
      }

      // Fetches every season individually (TMDB doesn't return per-episode
      // runtimes on the main /tv/{id} endpoint), then waits for all season
      // requests to finish before parsing their responses as JSON
      Promise.all(fetches)
      .then(response => {
        return Promise.all(response.map(response => {
          // If any single season request failed, throwing here rejects the whole
          // Promise.all, so one bad season fails the entire load rather than
          // silently producing incomplete watch-time data
          if (!response.ok) {
            throw new Error(`Season fetch failed: ${response.status}`)
          }
          return response.json()
          })
        )
      })
      .then(data => {
        // Reshapes TMDB's season/episode data down to just the fields
        // this app actually needs (season/episode numbers and runtime)
        const allData = data.map(item => {
            return {
              name: item.name,
              season_number: item.episodes[0].season_number, // pulled up to the top level, once
              episodes: item.episodes.map(episode => ({
                season_number: episode.season_number,
                episode_number: episode.episode_number,
                runtime: episode.runtime
              }))
            }
          })
        setSeasonsData(allData)
        setIsLoadingDetails(false)
      })
      .catch(() => {
        setIsLoadingDetails(false)
        setLoadError("Couldn't load this show. Try again in a moment.")
      })
    })
    .catch(() => {
      // Catches detail-fetch failures specifically; season failures are
      // already caught by the .catch() above and never reach this one
      setIsLoadingDetails(false)
      setLoadError("Couldn't load this show. Try again in a moment.")
    })

    return () => {
      controller.abort()
    }
  }, [selectedShow])

  // Keeps React state as the single source of truth for the input (controlled component)
  const handleSearchChange = (e) => {
    setSearchInput(e.target.value)
  }

  const handleSelectedShow = (show) => {
    setSelectedShow(show)
    setMatchingShow([])
    setSearchInput('')
  }

  const handleFromSeason = (e) => {
    setSeasonsRange({...seasonsRange, fromSeason: Number(e.target.value)})
  }

  const handleToSeason = (e) => {
    setSeasonsRange({...seasonsRange, toSeason: Number(e.target.value)})
  }

  return (
    <>
      {showDetails && (
        <div className="page-backdrop">
          <img src={getPosterUrl(showDetails.backdrop_path, 'w1280')} alt="" />
        </div>
      )}

      <div className="app">
        <h1 className="app-title">Bingemeter</h1>

        <SearchInput searchValue={searchInput} onSearchChange={handleSearchChange} />

        {isSearching && <LoadingCard text="Searching…" />}
        {loadError && <ErrorCard text={loadError} />}

        <ShowList shows={matchingShow} onSelectedShow={handleSelectedShow} />

        {isLoadingDetails && <LoadingCard text="Loading show details…" />}

        {showDetails && seasonsData.length > 0 && (
          <ShowDetail
            showDetails={showDetails}
            seasonsData={seasonsData}
            seasonsRange={seasonsRange}
            onHandleToSeason={handleToSeason}
            onHandleFromSeason={handleFromSeason}
          />
        )}
      </div>
    </>
  )
}

export default App