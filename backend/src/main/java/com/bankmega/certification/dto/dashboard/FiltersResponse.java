package com.bankmega.certification.dto.dashboard;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FiltersResponse {
    private List<FilterOption> regionals;
    private List<FilterOption> divisions;
    private List<FilterOption> units;
    private List<FilterOption> certifications;
    private List<FilterOption> levels;
    private List<FilterOption> subFields;
}
