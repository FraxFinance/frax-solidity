// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

interface IFraxBond_Curve {
    function get_total_points(uint8 curve_choice) external view returns (uint32);
    function get_curve_point(uint8 curve_choice, uint8 index) external view returns (uint32);
}