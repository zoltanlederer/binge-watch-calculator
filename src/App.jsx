import { useEffect, useState } from 'react'
import './App.css'

function SearchInput({searchValue, onSearchChange}){
  return (
    <input
      type='text'
      value={searchValue}
      onChange={onSearchChange}
    />
  )
}

function App() {
  const [searchInput, setSearchInput] = useState('')
  const [matchingShow, setMatchingShow] = useState([])

  // Refetches automatically whenever searchInput changes (runs on every keystroke for now — debounce comes later)
  useEffect(() => {
    // Wait 300ms after the last change to searchInput before fetching,
    // instead of firing a request on every keystroke
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
    // before the 300ms is up (runs before the effect re-runs, and on unmount)
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
      <ul>
        {matchingShow && matchingShow.map(show => {
          return <li key={show.id}>{show.name}</li>
        })}
      </ul>
    </>
  )
}

export default App
