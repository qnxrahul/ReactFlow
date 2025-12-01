import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import FileUpload from '../components/FileUpload/FileUpload'
import boardConfig from '../config/boardConfig.json'
import { recordWorkflowStep } from '../services/workspaceApi'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'
import { useBoards, type WorkspaceBoard, type WorkspaceLane } from '../state/BoardsProvider'
import './NewBoard/NewBoard.css'
import '../workspace-board.css'
import './MappingPage.css'

type SectionConfig = (typeof boardConfig.sections)[number]

type MappingSection = SectionConfig & {
  files: string[]
  persistedFiles: string[]
}

const uploadableSections = boardConfig.sections.filter((section) =>
  ['items-to-test', 'sample-documentation'].includes(section.id),
)

const mappingTodos = [
  'Upload items to be tested',
  'Review data extraction',
  'Approve data extraction',
  'Confirm document mapping',
  'Create workspace',
  'Review workpaper',
  'Approve workpaper',
]

const createSectionState = (section: SectionConfig): MappingSection => ({
  ...section,
  files: [],
  persistedFiles: [],
})

const sectionToLane = (section: MappingSection): WorkspaceLane => ({
  id: section.id,
  title: section.title,
  files: [...section.files],
})

const mergeBoardLanes = (board: WorkspaceBoard | null, replacements: WorkspaceLane[]): WorkspaceLane[] => {
  const replacementMap = new Map<string, WorkspaceLane>()
  replacements.forEach((lane) => {
    replacementMap.set(lane.id, lane)
  })

  const base = board?.lanes ?? []
  const merged: WorkspaceLane[] = base.map((lane) => {
    const replacement = replacementMap.get(lane.id)
    if (replacement) {
      replacementMap.delete(lane.id)
      return { ...lane, files: [...replacement.files], title: replacement.title }
    }
    return lane
  })

  replacementMap.forEach((lane) => merged.push(lane))
  return merged
}

export default function MappingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { boards, updateBoard, uploadFile } = useBoards()

  const locationWorkspaceId = (location.state as { workspaceId?: string } | null)?.workspaceId ?? null
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    if (locationWorkspaceId) return locationWorkspaceId
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem(LAST_CREATED_WORKSPACE_KEY)
    }
    return null
  })
  const workflowNavState = workspaceId ? { state: { workspaceId } } : undefined
  const [sections, setSections] = useState<MappingSection[]>(() => uploadableSections.map(createSectionState))

  useEffect(() => {
    if (locationWorkspaceId && locationWorkspaceId !== workspaceId) {
      setWorkspaceId(locationWorkspaceId)
    }
  }, [locationWorkspaceId, workspaceId])

  useEffect(() => {
    if (workspaceId && typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, workspaceId)
    }
  }, [workspaceId])

  const activeBoard = useMemo(
    () => (workspaceId ? boards.find((board) => board.id === workspaceId) ?? null : null),
    [workspaceId, boards],
  )

  useEffect(() => {
    if (!workspaceId) return
    void recordWorkflowStep(workspaceId, { step: 'mapping' }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Failed to record mapping workflow step', error)
      }
    })
  }, [workspaceId])

  useEffect(() => {
    if (!activeBoard) return
    setSections((prev) =>
      prev.map((section) => {
        const lane =
          activeBoard.lanes?.find((item) => item.id === section.id || item.title === section.title) ?? null
        if (!lane) return section
        const laneFiles = [...(lane.files ?? [])]
        return {
          ...section,
          files: laneFiles,
          persistedFiles: laneFiles,
          fileCount: laneFiles.length,
        }
      }),
    )
  }, [activeBoard])

  const persistLaneState = useCallback(
    async (nextSections: MappingSection[], uploads: File[]) => {
      if (!workspaceId) return

      if (uploads.length) {
        try {
          await Promise.all(uploads.map((file) => uploadFile(workspaceId, file)))
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Failed to upload workspace files', error)
          }
        }
      }

      try {
        const replacementLanes = nextSections.map(sectionToLane)
        const mergedLanes = mergeBoardLanes(activeBoard ?? null, replacementLanes)
        const filesCount = mergedLanes.reduce((total, lane) => total + lane.files.length, 0)
        await updateBoard(workspaceId, (prev) => ({
          ...prev,
          lanes: mergedLanes,
          filesCount,
        }))
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to persist mapping lanes', error)
        }
      }
    },
    [workspaceId, activeBoard, updateBoard, uploadFile],
  )

  const handleFilesChange = useCallback(
    (sectionId: string, files: File[]) => {
      setSections((prev) => {
        const prevSection = prev.find((section) => section.id === sectionId)
        const previousNames = prevSection?.files ?? []
        const persistedNames = prevSection?.persistedFiles ?? []
        const incomingNames = files.map((file) => file.name)
        const mergedNames = Array.from(new Set([...persistedNames, ...incomingNames]))
        const nextSections = prev.map((section) =>
          section.id === sectionId ? { ...section, files: mergedNames, fileCount: mergedNames.length } : section,
        )
        const uploadsToSave = files.filter((file) => !previousNames.includes(file.name))
        void persistLaneState(nextSections, uploadsToSave)
        return nextSections
      })
    },
    [persistLaneState],
  )

  const handleRemovePersistedFile = useCallback(
    (sectionId: string, fileName: string) => {
      setSections((prev) => {
        const nextSections = prev.map((section) => {
          if (section.id !== sectionId) return section
          if (!section.persistedFiles.includes(fileName)) return section
          const nextPersisted = section.persistedFiles.filter((name) => name !== fileName)
          const nextFiles = section.files.filter((name) => name !== fileName)
          return {
            ...section,
            persistedFiles: nextPersisted,
            files: nextFiles,
            fileCount: nextFiles.length,
          }
        })
        void persistLaneState(nextSections, [])
        return nextSections
      })
    },
    [persistLaneState],
  )

  const itemsSection = sections.find((section) => section.id === 'items-to-test')
  const sampleSection = sections.find((section) => section.id === 'sample-documentation')

  const mappingRows = useMemo(() => {
    const controlFiles = itemsSection?.persistedFiles ?? []
    const evidenceFiles = sampleSection?.persistedFiles ?? []
    const max = Math.max(controlFiles.length, evidenceFiles.length, 5)
    return Array.from({ length: max }).map((_, idx) => {
      const control = controlFiles[idx]
      const evidence = evidenceFiles[idx]
      const date = new Date(Date.now() - idx * 86400000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const documentRef = evidence ? `DOC-${Math.abs(hashString(evidence)).toString().slice(0, 6).padStart(6, '0')}` : 'Pending'
      const description = evidence ? evidence : 'Awaiting sample documentation'
      return {
        id: idx + 1,
        sample: control ?? `Sample ${idx + 1}`,
        date,
        documentRef,
        description,
        record: evidence ? 'View record' : 'Assign file',
        paired: Boolean(control && evidence),
      }
    })
  }, [itemsSection?.persistedFiles, sampleSection?.persistedFiles])

  function hashString(value: string): number {
    let hash = 0
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash)
  }

  const handleProceedToWorkpaper = () => {
    if (!workspaceId) return
    navigate('/workpaper', workflowNavState)
  }

  const handleAgentAction = () => {
    if (workspaceId) {
      navigate(`/new-board?boardId=${encodeURIComponent(workspaceId)}`)
      return
    }
    navigate('/new-board')
  }

  return (
    <div className="mapping-page">
      <header className="mapping-page__header">
        <div>
          <p>Engagement &gt; Spaces &gt; Mapping</p>
          <h1>Document mapping</h1>
          <span>Confirm samples are paired to the prior documentation before building the workpaper canvas.</span>
        </div>
        <div className="mapping-header__actions">
          <button type="button" onClick={handleProceedToWorkpaper}>
            Start workpaper build
          </button>
          <button type="button" className="secondary">
            Share mapping
          </button>
        </div>
      </header>

      <main className="mapping-page__body">
        <div className="mapping-grid">
          <div className="mapping-card mapping-card--todo">
            <div className="workspace-todo-header">
              <h2>To Do List</h2>
              <span>{mappingTodos.length} cards</span>
            </div>
            <ul className="workspace-todo-items">
              {mappingTodos.map((item) => (
                <li key={item} className="workspace-todo-item">
                  <label>
                    <input type="checkbox" />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button className="workspace-todo-update">Update</button>
          </div>

          {sections.map((section) => (
            <div key={section.id} className="mapping-card mapping-section-card">
              <div className="mapping-card__header">
                <div>
                  <strong>{section.title}</strong>
                  <span>{section.files.length} files</span>
                </div>
              </div>
              <div className="mapping-card__body">
                {section.persistedFiles.length > 0 ? (
                  <ul className="mapping-file-list">
                    {section.persistedFiles.map((file) => (
                      <li key={`${section.id}-${file}`}>
                        <span>{file}</span>
                        <button type="button" aria-label={`Remove ${file}`} onClick={() => handleRemovePersistedFile(section.id, file)}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mapping-empty-state">Files uploaded in New Board will appear here.</div>
                )}
                <FileUpload sectionId={section.id} onFilesChange={(files) => handleFilesChange(section.id, files)} maxFiles={50} />
              </div>
            </div>
          ))}

          <section className="mapping-card mapping-card--table">
            <header>
              <div>
                <strong>Document mapping table</strong>
                <span>Confirm samples are assigned to the prior document.</span>
              </div>
              <button type="button" onClick={handleProceedToWorkpaper}>
                Continue to workpaper
              </button>
            </header>
            <div className="mapping-table-wrapper">
              <table className="mapping-table">
                <thead>
                  <tr>
                    <th>Sample</th>
                    <th>Date</th>
                    <th>Document Ref #</th>
                    <th>Description</th>
                    <th>Record</th>
                  </tr>
                </thead>
                <tbody>
                  {mappingRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.sample}</td>
                      <td>{row.date}</td>
                      <td>{row.documentRef}</td>
                      <td>{row.description}</td>
                      <td>
                        <button type="button" className="mapping-record-btn">
                          {row.record}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="mapping-agent-panel">
          <div className="mapping-agent-panel__header">
            <strong>What's next?</strong>
            <ul>
              <li>Adjust any cards</li>
              <li>Recommend next steps</li>
              <li>Create a new flow chart</li>
              <li>Add more options</li>
            </ul>
          </div>
          <div className="mapping-agent-panel__input">
            <label htmlFor="mapping-agent-input">Ask me anything...</label>
            <div className="mapping-agent-panel__input-row">
              <input id="mapping-agent-input" placeholder="e.g., summarize mappings" />
              <button type="button" onClick={handleAgentAction}>
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="mapping-action-bar">
          {Array.from({ length: 6 }).map((_, idx) => (
            <span key={idx}>+</span>
          ))}
          <span className="mapping-action-bar__label">[Action bar]</span>
        </div>
      </main>

      <div className="mapping-flow-nav">
        <button type="button" onClick={() => navigate('/workspace', workflowNavState)}>
          Back to workspace
        </button>
        <button type="button" onClick={handleProceedToWorkpaper}>
          Next · Workpaper
        </button>
      </div>
    </div>
  )
}
