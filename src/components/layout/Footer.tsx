export function Footer() {
  return (
    <footer>
      <div className="mx-auto px-4 pt-3 pb-2 sm:px-6 lg:px-8">
        <p className="text-center text-xs text-gray-600">
          &copy; 2026 Experiment Designer. A hobby project created by{' '}
          <a
            href="https://www.xjrmh.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Li Zheng
          </a>{' '}
          &amp; AI friends. Open source on{' '}
          <a
            href="https://github.com/xjrmh/experiment-designer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </footer>
  )
}
