const DataTable = ({ columns, rows, emptyMessage = 'No data available.' }) => {
  if (!rows || rows.length === 0) {
    return (
      <div className="app-card rounded-card table-card page-empty p-4 text-center text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="app-card rounded-card table-card">
      <div className="table-responsive">
        <table className="table align-middle table-hover">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id || `${row.name || 'row'}-${index}`}>
                {columns.map((column) => (
                  <td key={`${column.key}-${row.id || index}`}>
                    {column.render ? column.render(row) : row[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
