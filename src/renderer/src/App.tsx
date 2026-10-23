// T-005 TEMPORARY: Drop test to verify webUtils.getPathForFile under sandbox+contextIsolation
import { useState } from 'react'

function App(): JSX.Element {
  const [lastPath, setLastPath] = useState<string>('')

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return

    // Call preload helper (webUtils.getPathForFile wrapper)
    const absPath = window.islandApi.getDroppedFilePath(file)
    setLastPath(absPath)

    // Send to main for logging
    window.islandApi.testLogDropPath(absPath)
  }

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
  }

  return (
    <main
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        border: '2px dashed #666',
      }}
    >
      <h1>Emoji Island — Drop Test (T-005)</h1>
      <p>Drag a file here to verify webUtils path retrieval.</p>
      {lastPath && (
        <pre style={{ marginTop: '1rem', wordBreak: 'break-all' }}>
          Last dropped: {lastPath}
        </pre>
      )}
    </main>
  )
}

export default App