export const Content: Component = ({ children }) => (
  <main
    data-site-content
    className="fill-content relative z-[1] px-4 pt-[4.5rem] md:px-0"
  >
    {children}
  </main>
)
