import { act, render, screen, waitFor } from "@testing-library/react";
import { Config } from "../../../types";
import "@testing-library/jest-dom";

jest.mock("../styles.module.css");
jest.mock("@dnd-kit/react");

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false, // default → desktop
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(), // ⬅️ legacy APIs some libs still call
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

jest.mock("@dnd-kit/react", () => {
  const original = jest.requireActual("@dnd-kit/react");
  return {
    ...original,
    // Provider becomes a no-op wrapper
    DragDropProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),

    // Hooks return dummy objects so destructuring works
    useDroppable: () => ({
      ref: () => undefined,
      setNodeRef: () => undefined,
      isOver: false,
    }),
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => undefined,
      isDragging: false,
    }),
  };
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

type PuckInternal = {
  appStore: AppStoreApi;
};

const getInternal = () => {
  return (window as any).__PUCK_INTERNAL_DO_NOT_USE as PuckInternal;
};

import { Puck } from "../index";
import { AppStoreApi } from "../../../store";

describe("Puck", () => {
  const componentARender = jest.fn(() => null);
  const componentBRender = jest.fn(() => null);
  const rootRender = jest.fn(() => null);

  const config: Config = {
    root: {
      render: ({ children }) => {
        rootRender();
        return <div>Root{children}</div>;
      },
    },
    components: {
      componentA: {
        render: () => {
          componentARender();
          return <div>Component A</div>;
        },
      },
      componentB: {
        render: () => {
          componentBRender();
          return <div>Component A</div>;
        },
      },
    },
  };

  afterEach(() => {
    rootRender.mockClear();
    componentARender.mockClear();
    componentBRender.mockClear();
  });

  // flush any queued state updates
  const flush = () => act(async () => {});

  it("root renders", async () => {
    render(<Puck config={config} data={{}} iframe={{ enabled: false }} />);

    await flush();

    expect(rootRender).toHaveBeenCalled();
    expect(screen.getByText("Root")).toBeInTheDocument();
  });

  it("should generate the correct state on mount", async () => {
    render(<Puck config={config} data={{}} iframe={{ enabled: false }} />);

    await flush();

    const { appStore } = getInternal();

    expect(appStore.getState()).toMatchSnapshot();
  });

  it("should index slots on mount", async () => {
    render(
      <Puck
        config={{
          root: {
            fields: {
              content: { type: "slot" },
            },
          },
          components: {},
        }}
        data={{
          root: {
            props: {
              content: [],
            },
          },
        }}
        iframe={{ enabled: false }}
      />
    );

    await flush();

    const { appStore } = getInternal();

    expect(appStore.getState().state.indexes).toMatchInlineSnapshot(`
      {
        "nodes": {
          "root": {
            "data": {
              "props": {
                "content": [],
                "id": "root",
              },
              "type": "root",
            },
            "flatData": {
              "props": {
                "content": null,
                "id": "root",
              },
              "type": "root",
            },
            "parentId": null,
            "path": [],
            "zone": "",
          },
        },
        "zones": {
          "root:content": {
            "contentIds": [],
            "type": "slot",
          },
          "root:default-zone": {
            "contentIds": [],
            "type": "root",
          },
        },
      }
    `);
  });

  it("preserves slot custom wrappers during async resolve loading and after completion", async () => {
    jest.useFakeTimers();

    try {
      let resolveParentData: (() => void) | null = null;

      const parentResolveData = jest.fn(
        async () =>
          await new Promise<{ props: Record<string, never> }>((resolve) => {
            resolveParentData = () => resolve({ props: {} });
          })
      );

      const CarouselScrollView = ({
        children,
        ...props
      }: {
        children: React.ReactNode;
      }) => (
        <section {...props} data-testid="carousel-scroll-view">
          {children}
        </section>
      );

      const loadingConfig: Config = {
        root: {
          render: ({ children }) => <div>{children}</div>,
        },
        components: {
          Parent: {
            fields: {
              items: { type: "slot" },
            },
            resolveData: parentResolveData,
            render: ({ items: Items }: any) => (
              <Items as={CarouselScrollView} className="carousel-slot" />
            ),
          },
          Child: {
            render: () => <div>Child</div>,
          },
        },
      };

      render(
        <Puck
          config={loadingConfig}
          data={{
            content: [
              {
                type: "Parent",
                props: {
                  id: "Parent-1",
                  items: [{ type: "Child", props: { id: "Child-1" } }],
                },
              },
            ],
          }}
          iframe={{ enabled: false }}
        />
      );

      await flush();

      expect(parentResolveData).toHaveBeenCalledTimes(1);

      const wrapper = screen.getByTestId("carousel-scroll-view");
      expect(wrapper).toHaveAttribute("data-puck-dropzone");

      await act(async () => {
        jest.advanceTimersByTime(60);
      });

      await waitFor(() => {
        const loadingWrapper = screen.getByTestId("carousel-scroll-view");
        expect(loadingWrapper).not.toHaveAttribute("data-puck-dropzone");
      });

      await act(async () => {
        resolveParentData?.();
      });

      await flush();

      await waitFor(() => {
        const resolvedWrapper = screen.getByTestId("carousel-scroll-view");
        expect(resolvedWrapper).toHaveAttribute("data-puck-dropzone");
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
