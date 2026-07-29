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

function ShowDetail({showDetails, seasonsData, seasonsRange, onHandleFromSeason, onHandleToSeason}){
  // Narrows seasonsData down to the selected from/to range before summing,
  // so the total reflects only the seasons the person wants to watch
  const filteredSeason = seasonsData.filter(season => {
    return season.season_number >= seasonsRange.fromSeason && season.season_number <= seasonsRange.toSeason
  })
  const totalMinutes = getTotalRuntimeMinutes(filteredSeason)
  const {days, hours, minutes} = formatWatchTime(totalMinutes)

  return (
    <>
    <p>
      <a href={`https://www.themoviedb.org/tv/${showDetails.id}`} target="_blank" rel="noopener noreferrer">
        <img src={getPosterUrl(showDetails.poster_path)} alt={`${showDetails.name} poster`} />
      </a>
    </p>
    <p><img src={getPosterUrl(showDetails.backdrop_path, 'w1280')} alt={`${showDetails.name} backdrop poster`} /></p>
    <p>{days} day(s) {hours} hour(s) {minutes} minute(s)</p>
    <p>{showDetails.name}</p>
    <p>{showDetails.overview}</p>
    <p>{showDetails.vote_average.toFixed(1)}</p>
    <p>{new Date(showDetails.first_air_date).getFullYear()}</p>
    <p>{showDetails.number_of_seasons}</p>
    <p>{showDetails.number_of_episodes}</p>
    <SeasonSelect
      numberOfSeasons={showDetails.number_of_seasons}
      value={seasonsRange.fromSeason}
      onChange={onHandleFromSeason} 
    />
    <SeasonSelect
      numberOfSeasons={showDetails.number_of_seasons}
      value={seasonsRange.toSeason}
      onChange={onHandleToSeason} 
    />
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
      setIsSearching(false)
      return
    }

    const controller = new AbortController()  
    setIsSearching(true)
    
    // Waits 500ms after the last change to searchInput before fetching,
    // so a fetch only fires once typing pauses, not on every keystroke
    const timeoutId = setTimeout(() => {
      fetch(`${tmdbBaseUrl}/search/tv?query=${searchInput}`, {...fetchHeader, signal: controller.signal})
        .then(response => response.json())
        .then(data => {
          setMatchingShow(data.results)
          setIsSearching(false)
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
    if (!selectedShow) { return }
    const controller = new AbortController()  
    // Tracks the loading state across the whole chain: show details,
    // then all season fetches — only clears once seasonsData is ready
    setIsLoadingDetails(true)
    fetch(`${tmdbBaseUrl}/tv/${selectedShow.id}`, {...fetchHeader, signal: controller.signal})
    .then(response => response.json())
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
        return Promise.all(response.map(response => response.json()))
      })
      .then(data => {
        // Reshapes TMDB's season/episode data down to just the fields
        // this app actually needs (season/episode numbers and runtime)
        const allData = data.map(item => {
            return {
              name: item.name,
              season_number: item.episodes[0].season_number,  // pulled up to the top level, once
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
  }

  const handleFromSeason = (e) => {
    setSeasonsRange({...seasonsRange, fromSeason: Number(e.target.value)})
  }

  const handleToSeason = (e) => {
    setSeasonsRange({...seasonsRange, toSeason: Number(e.target.value)})
  }

  return (
    <>
      <h1>Binge-watch calculator</h1>
      <SearchInput searchValue={searchInput} onSearchChange={handleSearchChange} />
      <p>{searchInput}</p>
      {isSearching && <span className='spinner'></span>}
      <ShowList shows={matchingShow} onSelectedShow={handleSelectedShow} />
      {selectedShow && <p>Selected: {selectedShow.name}</p>}

      {isLoadingDetails && <span className='spinner'></span>}
      {showDetails && seasonsData.length > 0 && (
        <ShowDetail 
          showDetails={showDetails}
          seasonsData={seasonsData} 
          seasonsRange={seasonsRange}
          onHandleToSeason={handleToSeason}
          onHandleFromSeason={handleFromSeason}
        />
      )}
      
    </>
  )
}

export default App
