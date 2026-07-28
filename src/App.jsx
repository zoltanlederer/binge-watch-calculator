import { useEffect, useState } from 'react'
import './App.css'

// A plain function, not a component — pure, reusable, no state involved
function getPosterUrl(posterPath){
  const posterBaseUrl = 'https://image.tmdb.org/t/p/'
  const posterSize = 'w185'
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
  // formatting only, App just needs the raw total for its own logic
  const days = Math.floor(totalMinutes / 1440)
  const remainingAfterDays = totalMinutes % 1440
  const hours = Math.floor(remainingAfterDays / 60)
  const minutes = remainingAfterDays % 60
  return {days, hours, minutes}
}

function SearchInput({searchValue, onSearchChange}){
  return (
    <input
      type='text'
      value={searchValue}
      onChange={onSearchChange}
    />
  )
}

function ShowList({shows, onSelectedShow}){
  return (
    <ul>
      {shows && shows.slice(0, 6).map(show => {
        return (
          <ShowListItem key={show.id} show={show} onSelectedShow={onSelectedShow} />
        )
      })}
    </ul>
    )
}

function ShowListItem({show, onSelectedShow}){
  return (
    <li onClick={() => onSelectedShow(show)}>
      <img src={getPosterUrl(show.poster_path)} alt={`${show.name} poster`} />
      {show.name}
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

function App() {
  const [searchInput, setSearchInput] = useState('')
  const [matchingShow, setMatchingShow] = useState([])
  const [selectedShow, setSelectedShow] = useState(null)
  const [showDetails, setShowDetails] = useState(null)
  const [seasonsData, setSeasonsData] = useState([])
  const [seasonsRange, setSeasonsRange] = useState({fromSeason: 1, toSeason: 1})

  const tmdbBaseUrl = 'https://api.themoviedb.org/3'
  const fetchHeader = {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_TOKEN}`,
        accept: "application/json"
      }
    }

  // Refetches automatically whenever searchInput changes
  useEffect(() => {
    // Skip fetching for very short input, and clear old results
    // so they don't linger on screen if the search box is cleared
    if (searchInput.length < 2 ){
      setMatchingShow([])
      return
    }
    
    // Waits 500ms after the last change to searchInput before fetching,
    // so a fetch only fires once typing pauses, not on every keystroke
    const timeoutId = setTimeout(() => {
      fetch(`${tmdbBaseUrl}/search/tv?query=${searchInput}`, fetchHeader)
        .then(response => response.json())
        .then(data => {
          setMatchingShow(data.results)
        })
    }, 500)

    // Cancels the scheduled fetch above if searchInput changes again
    // before the 500ms is up (runs before the effect re-runs, and on unmount)
    return () => {
      clearTimeout(timeoutId)
    }
  }, [searchInput])

  useEffect(() => {
    if (!selectedShow) { return }
    fetch(`${tmdbBaseUrl}/tv/${selectedShow.id}`, fetchHeader)
    .then(response => response.json())
    .then(data => {
      setShowDetails(data)
      // Resets the range to the full show whenever a new show is selected,
      // rather than merging with the previous show's leftover range
      setSeasonsRange({fromSeason: 1, toSeason: data.number_of_seasons})

      const fetches = []
      for(let i = 1; i <= data.number_of_seasons; i++){
        fetches.push(fetch(`${tmdbBaseUrl}/tv/${selectedShow.id}/season/${i}`, fetchHeader))
      }

      // Fetches every season individually (TMDB doesn't return per-episode
      // runtimes on the main /tv/{id} endpoint), then waits for all season
      // requests to finish before parsing their responses as JSON
      Promise.all(fetches)
      .then(response => {
        return Promise.all(response.map(response => response.json()))
      })
      .then(data => {
        // Reshapes TMDB's season/episode data down to just the fields
        // this app actually needs (season/episode numbers and runtime)
        const allData = data.map(item => {
            return {
              name: item.name,
              episodes: item.episodes.map(episode => ({
                season_number: episode.season_number,
                episode_number: episode.episode_number,
                runtime: episode.runtime
              }))
            }
          })
        setSeasonsData(allData)
      })
    })
  }, [selectedShow])

  // Keeps React state as the single source of truth for the input (controlled component)
  const handleSearchChange = (e) => {
    setSearchInput(e.target.value)
  }

  const handleSelectedShow = (show) => {
    setSelectedShow(show)
    setMatchingShow([])
  }

  const handleFromSeason = (e) => {
    setSeasonsRange({...seasonsRange, fromSeason: e.target.value})
  }

  const handleToSeason = (e) => {
    setSeasonsRange({...seasonsRange, toSeason: e.target.value})
  }

  const totalMinutes = getTotalRuntimeMinutes(seasonsData)
  const {days, hours, minutes} = formatWatchTime(totalMinutes)

  return (
    <>
      <h1>Binge-watch calculator</h1>
      <SearchInput searchValue={searchInput} onSearchChange={handleSearchChange} />
      <p>{searchInput}</p>
      <ShowList shows={matchingShow} onSelectedShow={handleSelectedShow} />
      {selectedShow && <p>Selected: {selectedShow.name}</p>}
      {seasonsData.length > 0 && <p>{days} day(s) {hours} hour(s) {minutes} minute(s)</p>}
      {showDetails && (
        <>
          <SeasonSelect
            numberOfSeasons={showDetails && showDetails.number_of_seasons}
            value={seasonsRange.fromSeason}
            onChange={handleFromSeason} 
          />
          <SeasonSelect
            numberOfSeasons={showDetails && showDetails.number_of_seasons}
            value={seasonsRange.toSeason}
            onChange={handleToSeason} 
          />
        </>
      )}

      
    </>
  )
}

export default App
