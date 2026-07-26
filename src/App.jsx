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

function SearchInput({searchValue, onSearchChange}){
  return (
    <input
      type='text'
      value={searchValue}
      onChange={onSearchChange}
    />
  )
}

function ShowList({shows}){
  return (
    <ul>
      {shows && shows.slice(0, 6).map(show => {
        return (
          <ShowListItem key={show.id} show={show} />
        )
      })}
    </ul>
    )
}

function ShowListItem({show}){
  return (
    <li>
      <img src={getPosterUrl(show.poster_path)} alt={`${show.name} poster`} />
      {show.name}
    </li>
  )
}

function App() {
  const [searchInput, setSearchInput] = useState('')
  const [matchingShow, setMatchingShow] = useState([])

  // Refetches automatically whenever searchInput changes
  useEffect(() => {
    // Waits 500ms after the last change to searchInput before fetching,
    // so a fetch only fires once typing pauses, not on every keystroke
    const timeoutId = setTimeout(() => {
      fetch(`https://api.themoviedb.org/3/search/tv?query=${searchInput}`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_TOKEN}`,
          accept: "application/json"
        }
      })
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

  // Keeps React state as the single source of truth for the input (controlled component)
  const handleSearchChange = (e) => {
    setSearchInput(e.target.value)
  }
  
  return (
    <>
      <h1>Binge-watch calculator</h1>
      <SearchInput searchValue={searchInput} onSearchChange={handleSearchChange} />
      <p>{searchInput}</p>
      <ShowList shows={matchingShow} />
    </>
  )
}

export default App
