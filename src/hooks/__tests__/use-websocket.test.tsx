import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useWebSocket } from "@/hooks/use-websocket"
import { WS_URL } from "@/lib/constants"

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  static instances: MockWebSocket[] = []

  readyState = MockWebSocket.CONNECTING
  sent: unknown[] = []

  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  send(data: unknown) {
    this.sent.push(data)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.()
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.()
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data })
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.()
  }
}

describe("useWebSocket", () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal("WebSocket", MockWebSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("connects to the configured WS_URL on mount", () => {
    renderHook(() => useWebSocket())

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe(WS_URL)
  })

  it("reports connected when the socket opens", () => {
    const { result } = renderHook(() => useWebSocket())
    const socket = MockWebSocket.instances[0]

    expect(result.current.isConnected).toBe(false)

    act(() => socket.simulateOpen())
    expect(result.current.isConnected).toBe(true)
  })

  it("parses incoming JSON into lastMessage", () => {
    const { result } = renderHook(() => useWebSocket())
    const socket = MockWebSocket.instances[0]

    act(() => socket.simulateOpen())
    act(() => socket.simulateMessage('{"type":"ping","payload":{"n":1}}'))

    expect(result.current.lastMessage).toEqual({ type: "ping", payload: { n: 1 } })
  })

  it("delivers parsed messages to the onEvent callback", () => {
    const onEvent = vi.fn()
    renderHook(() => useWebSocket({ onEvent }))
    const socket = MockWebSocket.instances[0]

    act(() => socket.simulateOpen())
    act(() => socket.simulateMessage('{"type":"event_a"}'))

    expect(onEvent).toHaveBeenCalledWith({ type: "event_a" })
  })

  it("ignores non-JSON messages", () => {
    const onEvent = vi.fn()
    const { result } = renderHook(() => useWebSocket({ onEvent }))
    const socket = MockWebSocket.instances[0]

    act(() => socket.simulateOpen())
    act(() => socket.simulateMessage("plain text, not json"))

    expect(result.current.lastMessage).toBeNull()
    expect(onEvent).not.toHaveBeenCalled()
  })

  it("serialises send payloads as JSON when the socket is open", () => {
    const { result } = renderHook(() => useWebSocket())
    const socket = MockWebSocket.instances[0]

    act(() => socket.simulateOpen())
    act(() => result.current.send({ type: "hello" }))

    expect(socket.sent).toEqual([JSON.stringify({ type: "hello" })])
  })

  it("drops sends while the socket is not open", () => {
    const { result } = renderHook(() => useWebSocket())
    const socket = MockWebSocket.instances[0]

    act(() => result.current.send("not connected"))

    expect(socket.sent).toEqual([])
  })

  it("reconnects with a 1s delay after an unexpected close", () => {
    vi.useFakeTimers()
    renderHook(() => useWebSocket())
    const first = MockWebSocket.instances[0]

    act(() => first.simulateOpen())

    act(() => first.simulateClose())

    act(() => vi.advanceTimersByTime(999))
    expect(MockWebSocket.instances).toHaveLength(1)

    act(() => vi.advanceTimersByTime(1))
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it("cleans up the socket on unmount", () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(() => useWebSocket())
    const socket = MockWebSocket.instances[0]

    unmount()
    expect(socket.readyState).toBe(MockWebSocket.CLOSED)

    act(() => vi.advanceTimersByTime(5000))
    expect(MockWebSocket.instances).toHaveLength(1)
  })
})