const DataTable = ({ columns, rows, emptyMessage = 'No data available.', showEmptyTable = false, tableClassName = '' }) => {
  if ((!rows || rows.length === 0) && !showEmptyTable) {
    return (
      <div className="app-card rounded-card table-card page-empty p-4 text-center text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="app-card rounded-card table-card">
      <div className="table-responsive">
        <table className={`table align-middle table-hover ${tableClassName}`.trim()}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows && rows.length > 0 ? rows.map((row, index) => (
              <tr key={row.id || `${row.name || 'row'}-${index}`}>
                {columns.map((column) => (
                  <td key={`${column.key}-${row.id || index}`}>
                    {column.render ? column.render(row) : row[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td className="text-center text-muted" colSpan={columns.length}>{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
