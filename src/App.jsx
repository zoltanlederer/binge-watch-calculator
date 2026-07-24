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

  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/search/tv?query=${searchInput}`, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_TOKEN}`,
        accept: "application/json"
      }
    })
    .then(response => response.json())
    .then(data => console.log(data))
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
    </>
  )
}

export default App
