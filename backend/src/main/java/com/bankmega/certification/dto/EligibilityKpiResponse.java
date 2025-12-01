package com.bankmega.certification.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EligibilityKpiResponse {

    private Long active; // jumlah status ACTIVE
    private Long due; // jumlah status DUE
    private Long expired; // jumlah status EXPIRED
    private Long notYetCertified; // jumlah status NOT_YET_CERTIFIED

    private Long eligibleTotal; // total populasi eligibility (sum semua status di atas)
}
