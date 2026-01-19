CREATE TABLE employee_positions (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    position_type VARCHAR(20) NOT NULL CHECK (position_type IN ('PRIMARY', 'SECONDARY')),
    regional_id BIGINT REFERENCES regionals(id),
    division_id BIGINT REFERENCES divisions(id),
    unit_id BIGINT REFERENCES units(id),
    job_position_id BIGINT REFERENCES job_positions(id),
    effective_date DATE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT unique_employee_position_type UNIQUE (employee_id, position_type)
);

CREATE INDEX idx_emp_positions_employee ON employee_positions(employee_id);
CREATE INDEX idx_emp_positions_job ON employee_positions(job_position_id);
CREATE INDEX idx_emp_positions_type ON employee_positions(position_type);

INSERT INTO employee_positions 
    (employee_id, position_type, regional_id, division_id, unit_id, 
     job_position_id, effective_date, is_active, created_at, updated_at)
SELECT 
    id, 
    'PRIMARY', 
    regional_id, 
    division_id, 
    unit_id,
    job_position_id, 
    effective_date, 
    true, 
    COALESCE(created_at, NOW()), 
    COALESCE(updated_at, NOW())
FROM employees
WHERE job_position_id IS NOT NULL AND deleted_at IS NULL;
