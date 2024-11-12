---
layout: page
title: DeltaRobot KineCalc
permalink: /delta_kinematics_calculator/
weight: 4
---

<style>
.content-container {
  padding: 30px;
  margin: 20px 0;
  border-radius: 12px;
  background-color: #fff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.header-text {
  margin-bottom: 30px;
}

.calculator-frame {
  width: 100%;
  height: 800px;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>

<div class="content-container">
  <div class="header-text">
    <h1>Delta Robot Kinematics Calculator</h1>
    <p>With this tool, you can plan the dimensions of your robot, visualize the movement of end effector of delta robot based on joint parameters and also visualize the joint trajectory of motor for a given spline path.</p>
  </div>

  <iframe 
    src="https://delta-robot.streamlit.app/?embed=true" 
    class="calculator-frame">
  </iframe>
</div>