---
name: Odometry, Mapping and Probabilistic C-Spaces
tools: [Python]
image: "/assets/images/nav_map.gif"
description: We must know where we are, where we can be and where we cannot.
layout: project-details
---

<div style="text-align: center;">
  <video width="600" controls>
    <source src="/assets/videos/nav_map.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
</div>

# Tiago Robot in Kitchen Simulation 
### ```Odometry```, ```Differential Kinematics```, ```LiDAR-based Mapping```, ```Probabilistic C-Spaces```, ```RRT, A*```, ```Behaviour Trees```

This repository contains a **Webots project** featuring a **Tiago robot** in a simulated kitchen environment. The project includes a detailed **world file** for the kitchen setup and **controller scripts** for managing the robot's behavior.

## Overview

- **Simulation Environment**: A kitchen world with realistic elements, allowing the Tiago robot to navigate and interact with its surroundings.
- **Robot**: The Tiago robot is configured with sensors and actuators to perform tasks within the kitchen.
- **Controllers**: Custom scripts to control the robot’s behaviour which is to navigate to certain waypoints while simultaneously mapping the environment, planning path to goal location, generate trajectory and move through the trajectory.
 
---

## Repository Structure

- `worlds/` - Contains the Webots world file for the kitchen simulation.
  - `kitchen.wbt` - The main simulation world featuring a kitchen setup.
- `controllers/` - Includes custom controllers for the Tiago robot.
  - `controller_BT/AStar.py` - [GitHub](https://github.com/WinnerBishal/tiago-nav-map-plan/blob/main/controllers/controller_BT/AStar.py) A* algorith code
  - `controller_BT/RRT_Planner.py` - [GitHub](https://github.com/WinnerBishal/tiago-nav-map-plan/blob/main/controllers/controller_BT/RRT_Planner.py) RRT Algorithm code
  - `controller_BT/controller_BT.py` - [GitHub](https://github.com/WinnerBishal/tiago-nav-map-plan/blob/main/controllers/controller_BT/controller_BT.py) Main behaviour controller for autonomous operation
  - `controller_BT/mapping_leaf.py` - [GitHub](https://github.com/WinnerBishal/tiago-nav-map-plan/blob/main/controllers/controller_BT/mapping_leaf.py) Mapping node for mapping and storing the environment
  - `controller_BT/navigation_leaf.py` - [GitHub](https://github.com/WinnerBishal/tiago-nav-map-plan/blob/main/controllers/controller_BT/navigation_leaf.py) Navigation node for waypoint following
  - `controller_BT/planning_leaf.py` - [GitHub](https://github.com/WinnerBishal/tiago-nav-map-plan/blob/main/controllers/controller_BT/planning_leaf.py) Planning leaf for trajectory generation





---

