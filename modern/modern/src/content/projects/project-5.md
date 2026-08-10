---
name: Drone Physics Simulation
tools: [Python, Quadrotor Dynamics, In Progress]
image: "/assets/images/drone_dynamics.gif"
description: This project uses Newton-Euler's equation to model drone physics and uses python for simulation.
layout: project-details
permalink: /dronedyn/
---

## Description

The **Drone Dynamics Visualizer** is an interactive simulation tool designed to model and visualize the dynamics of a quadcopter drone. The project provides a real-time visual interface to simulate drone physics, including translational and rotational motion, using Tkinter and Matplotlib. The application is equipped with user controls for rotor speed adjustments and the ability to record the simulation for video playback.

This serves as a simulation environment for an ongoing project : RL Based Drone Navigation Project [Github](https://github.com/adhikariprajitraj/3D-Drone-Navigation-Project).

## Dynamics of Quadrotor

The quadrotor dynamics are modeled using Newton-Euler equations of motion, accounting for gravitational force, thrust force and torques applied by the four rotors. **Thanks to the fantastic lecture at** [Youtube](https://youtu.be/xCoFaTyn5dg?si=maYhMO44H1Hx8usr)

Here are the key equations:

### Symbols

| Symbol         | Description                            |
|----------------|----------------------------------------|
| \( x, y, z \)           | Position coordinates in 3D space    |
| \( u, v, w \)           | Velocity components along \(x, y, z\)|
| \( $\phi$, $\theta$, $\psi$ \) | Roll, pitch, and yaw angles        |
| \( $\omega_1$, $\omega_2$, $\omega_3$, $\omega_4$ \) | Rotor speeds |
| \( l \)        | Distance from the center to each rotor |
| \( b \)        | Torque constant                        |
| \( k \)        | Aerodynamic constant                   |
| \( $I_x$, $I_y$, $I_z$ \)     | Moments of inertia along each axis |
| \( m \)        | Mass of the quadrotor                  |
| \( g \)        | Gravitational acceleration             |

### Translational Equations of Motion

From the Newton-Euler equations (Equations 1, 2, and 3), you can calculate the accelerations along the x, y, and z axes using the thrust and orientation angles.

$$a_x = \frac{T \cdot \sin(\theta)}{m}$$

$$a_y = \frac{-mg \cdot \cos(\theta) \cdot \sin(\phi)}{m}$$

$$a_z = \frac{T - mg \cdot \cos(\theta) \cdot \cos(\phi)}{m}$$

### Rotational Equations of Motion

The roll, pitch, and yaw torques, which are calculated from the rotor speeds, affect the drone’s angular acceleration. Using Equations 4, 5, and 6:

$$\dot{p} = \frac{l \cdot k \cdot (\omega_4^2 - \omega_2^2)}{I_{x3}} - \frac{q \cdot r \cdot (I_{z3} - I_{y3})}{I_{x3}}$$
   
$$\dot{q} = \frac{l \cdot k \cdot (\omega_3^2 - \omega_1^2)}{I_{y3}} - \frac{r \cdot p \cdot (I_{x3} - I_{z3})}{I_{y3}}$$
   
$$\dot{r} = \frac{b \cdot (\omega_1^2 - \omega_2^2 + \omega_3^2 - \omega_4^2)}{I_{z3}} + \frac{p \cdot q \cdot (I_{y3} - I_{x3})}{I_{z3}}$$



### Transformation from Inertial Frame to Body-Fixed Frame

The angular velocities in the body-fixed frame (\( p \), \( q \), \( r \)) can be related to the rates of change of the Euler angles (\( $\dot{\phi}$ \), \( $\dot{\theta}$ \), \( $\dot{\psi} $\)) by the following transformation:

$$
\begin{bmatrix} p \\ q \\ r \end{bmatrix} =
\begin{bmatrix}
1 & 0 & -\sin(\theta) \\
0 & \cos(\phi) & \cos(\theta) \sin(\phi) \\
0 & -\sin(\phi) & \cos(\theta) \cos(\phi)
\end{bmatrix}
\begin{bmatrix} \dot{\phi} \\ \dot{\theta} \\ \dot{\psi} \end{bmatrix}
$$

---

## Features

- **Real-Time Drone Simulation**: Visualizes 3D drone dynamics with adjustable rotor speeds.
- **Interactive User Controls**: Control rotor speeds, simulation speed, and emergency stop.
- **Telemetry Display**: Real-time position, orientation, and velocity updates.
- **Recording and Video Export**: Capture the entire Tkinter window (including controls) and export the simulation as a video.
- **Customizable Parameters**: Easily adjust physical parameters like mass, arm length, and thrust coefficients.

---

## Prerequisites

- Python 3.8+
- Required Python Libraries:
  - `numpy`
  - `matplotlib`
  - `tkinter` (included with Python)
  - `Pillow`
  - `moviepy`

Access through [GitHub](https://github.com/adhikariprajitraj/3D-Drone-Navigation-Project/blob/main/optimization_rl/visualization/drone_dynamics_visualizer.py)

---

<!-- ---
name: Actor Critic RL for Obstacle Avoidance and Trajectory Following in 3D for UAVs
tools: [Python, Quadrotor Dynamics, In Progress]
image: "/assets/images/nav3d.gif"
description: Given a map of obstacles in 3d, this program is able to generate a path from start to end using RRT and A* and apply RL based control to follow the trajectory.
layout: project-details
permalink: /nav3d/
---

# 3D Drone Navigation Project

## Overview
The 3D Drone Navigation project aims to design a sophisticated simulation where a drone navigates through a 3D cubic space filled with static obstacles. The primary goal is to develop a reinforcement learning (RL) model and path optimization algorithms to guide the drone in finding the shortest path from a starting point to an endpoint within this environment, while avoiding collisions.

## Project Objectives
- **Simulate a 3D environment** with static obstacles to test drone navigation.
- **Develop a virtual drone model** equipped with necessary movement capabilities.
- **Implement pathfinding algorithms** such as A* and RRT to generate initial path estimates.
- **Integrate RL algorithms** (e.g., Proximal Policy Optimization) for dynamic path optimization.
- **Evaluate the performance** of the drone based on path length, time taken, and obstacle avoidance.

## Features
- **3D Cubic Environment**: A simulated 3D space containing various static obstacles.
- **Path Planning**: Initial paths are generated using traditional algorithms.
- **Reinforcement Learning**: The drone refines its path through RL training.
- **Evaluation Metrics**: The drone’s performance is measured by path length, time to destination, and efficiency.

---

## Dynamics of Quadrotor

The quadrotor dynamics are modeled using standard translational and rotational equations of motion, accounting for forces and torques applied by the four rotors. Here are the key equations:

### Symbols

| Symbol         | Description                            |
|----------------|----------------------------------------|
| \( x, y, z \)           | Position coordinates in 3D space    |
| \( u, v, w \)           | Velocity components along \(x, y, z\)|
| \( $\phi$, $\theta$, $\psi$ \) | Roll, pitch, and yaw angles        |
| \( $\omega_1$, $\omega_2$, $\omega_3$, $\omega_4$ \) | Rotor speeds |
| \( l \)        | Distance from the center to each rotor |
| \( b \)        | Torque constant                        |
| \( k \)        | Aerodynamic constant                   |
| \( $I_x$, $I_y$, $I_z$ \)     | Moments of inertia along each axis |
| \( m \)        | Mass of the quadrotor                  |
| \( g \)        | Gravitational acceleration             |

### Translational Equations of Motion

From the Newton-Euler equations (Equations 1, 2, and 3), you can calculate the accelerations along the x, y, and z axes using the thrust and orientation angles.

$$a_x = \frac{T \cdot \sin(\theta)}{m}$$

$$a_y = \frac{-mg \cdot \cos(\theta) \cdot \sin(\phi)}{m}$$

$$a_z = \frac{T - mg \cdot \cos(\theta) \cdot \cos(\phi)}{m}$$

### Rotational Equations of Motion

The roll, pitch, and yaw torques, which are calculated from the rotor speeds, affect the drone’s angular acceleration. Using Equations 4, 5, and 6:

$$\dot{p} = \frac{l \cdot k \cdot (\omega_4^2 - \omega_2^2)}{I_{x3}} - \frac{q \cdot r \cdot (I_{z3} - I_{y3})}{I_{x3}}$$
   
$$\dot{q} = \frac{l \cdot k \cdot (\omega_3^2 - \omega_1^2)}{I_{y3}} - \frac{r \cdot p \cdot (I_{x3} - I_{z3})}{I_{y3}}$$
   
$$\dot{r} = \frac{b \cdot (\omega_1^2 - \omega_2^2 + \omega_3^2 - \omega_4^2)}{I_{z3}} + \frac{p \cdot q \cdot (I_{y3} - I_{x3})}{I_{z3}}$$



### Transformation from Inertial Frame to Body-Fixed Frame

The angular velocities in the body-fixed frame (\( p \), \( q \), \( r \)) can be related to the rates of change of the Euler angles (\( $\dot{\phi}$ \), \( $\dot{\theta}$ \), \( $\dot{\psi} $\)) by the following transformation:

$$
\begin{bmatrix} p \\ q \\ r \end{bmatrix} =
\begin{bmatrix}
1 & 0 & -\sin(\theta) \\
0 & \cos(\phi) & \cos(\theta) \sin(\phi) \\
0 & -\sin(\phi) & \cos(\theta) \cos(\phi)
\end{bmatrix}
\begin{bmatrix} \dot{\phi} \\ \dot{\theta} \\ \dot{\psi} \end{bmatrix}
$$

---

## Implementation Details of the Algorithm

### Environment Setup

The environment is designed as a 3D space with customizable boundaries and static obstacles. Static obstacles are represented as spherical objects, and each has a defined position and radius within the environment.

### Pathfinding

Pathfinding uses A* or RRT (Rapidly-Exploring Random Trees) to find a preliminary path from the start point to the endpoint, avoiding static obstacles. This path serves as a guide for the RL agent.

### Reinforcement Learning (RL)

The project uses Proximal Policy Optimization (PPO) as the primary RL algorithm. The RL model refines the drone’s path by interacting with the environment, learning to navigate while avoiding obstacles and optimizing for the shortest path.

### Action and State Representation

- **Actions**: The agent’s actions correspond to the four rotor speeds, \($\omega_1$\), \($\omega_2$\), \($\omega_3$\), and \($\omega_4$\), controlling thrust and rotational dynamics.
- **State**: The state vector includes position, orientation, velocity, goal distance, and obstacle information.

### Reward Function

The reward function incentivizes the agent to reach the goal efficiently:
- **Distance Reward**: Encourages reduction in distance to the goal.
- **Goal Reward**: Provides a high reward for reaching the endpoint.
- **Collision Penalty**: Penalizes the agent for colliding with obstacles.
- **Efficiency Penalty**: Penalizes unnecessary actions or deviations from the path.

---

## Github
https://github.com/username/3D-Drone-Navigation-Project.git
 -->
