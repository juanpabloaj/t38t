var camera, scene;
var MTS = 1e7;
var PI = Math.PI;
var shipName;
var z0, x0;
var lifeSocket;

// https://material.io/guidelines/style/color.html
var COLORS = {
  0: "#ffcdd2", 5: "#f8bbd0", 10: "#e1bee7", 15: "#d1c4e9",
  20: "#c5cae9", 25: "#bbdefb", 30: "#b3e5fc", 35: "#b2ebf2",
  40: "#b2dfdb", 45: "#c8e6c9", 50: "#dcedc8", 55: "#f0f4c3",
  60: "#fff9c4", 65: "#ffecb3", 70: "#ffe0b2", 75: "#ffccbc",
  80: "#d7ccc8", 85: "#f5f5f5", 90: "#cfd8dc", 95: "#ef9a9a",
  100: "#f48fb1", 105: "#ce93d8", 110: "#b39ddb", 115: "#9fa8da",
  120: "#90caf9", 125: "#81d4fa", 130: "#80deea", 135: "#80cbc4",
  140: "#a5d6a7", 145: "#c5e1a5", 150: "#e6ee9c", 155: "#fff59d",
  160: "#ffe082", 165: "#ffcc80", 170: "#ffab91", 175: "#bcaaa4",
  180: "#eeeeee", 185: "#b0bec5",
};

var socketHost = "209.177.93.71";
socketHost = "ws://" + socketHost + ":8080";

init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth * 0.9, window.innerHeight * 0.76);

  var container = document.getElementById("three-container");
  container.appendChild(renderer.domElement);

  setKeys();

  lifeSocket = new WebSocket(socketHost);
  var collisionSocket = new WebSocket(socketHost);

  lifeSocket.onopen = function (event) {
    lifeSocket.send(JSON.stringify({message:"init"}));
    lifeSocket.send(JSON.stringify({message:"scan rocks"}));
  };

  lifeSocket.onmessage = function(event) {
    var data  = JSON.parse(event.data);
    if ( data.message == "init" ) {
      var angle = data.name;
      var lat = Number(data.lat);
      var lng = Number(data.lng);
      shipName = angle;
      angle = Number(angle);

      camera.position.z = z0 = lng * MTS;
      camera.position.x = x0 = lat * MTS;
      camera.rotateY((90-angle) * PI /180);

      showColorMessage(getQuote(), COLORS[angle]);
      showColorMessage("Welcome ship" + shipName, COLORS[angle]);

      lifeSocket.send(JSON.stringify({
        message:"show collitions", name: shipName
      }));
      lifeSocket.send(JSON.stringify({message:"new ships"}));

      setInterval(sendPosition, 500);
      setInterval(function(){
        lifeSocket.send(JSON.stringify({message:"scan ships"}));
      }, 500);
      setInterval(function(){
        lifeSocket.send(JSON.stringify({message:"scan rocks"}));
      }, 2000);
      setInterval(function(){
        lifeSocket.send(JSON.stringify({message:"scan bullets"}));
      }, 1000);
    }
    if (data.message === "rocks")
      showRocks(data.data);
    if (data.message === "ships")
      showShips(data.data);
    if (data.message === "bullets")
      showBullets(data.data);
    if (data.message === "show collitions")
      showCollition(data.data);
    if (data.message === "new ships")
      newShips(data.data);
  };

}

function setKeys() {
  window.addEventListener('keydown', function(event) {
    switch (event.keyCode) {
      case 87: // w
        var direction = camera.getWorldDirection();
        camera.position.add( direction.multiplyScalar(20) );
        break;
      case 65: // a
        camera.rotateY(5*PI/180);
        break;
      case 68: // d
        camera.rotateY(-5*PI/180);
        break;
      case 81: // q
        lifeSocket.send(JSON.stringify({
          message: "bullet",
          direction: camera.getWorldDirection(),
          position: {x: camera.position.x/MTS, z: camera.position.z/MTS}
        }));
        break;
    }
  });
}

function sendPosition() {
  var lat = camera.position.x / MTS;
  var lng = camera.position.z / MTS;
  lifeSocket.send(JSON.stringify({
    message: "set position", name:shipName, lat:lat, lng:lng
  }));
}

function animate() {
  requestAnimationFrame(animate);

  for (var rock of scene.children) {

    if (!rock.up.y) {
      rock.position.add( rock.up.multiplyScalar(1.055) );
    } else
      rock.rotation.y += 0.01;
  }

  var direction = camera.getWorldDirection();
  camera.position.add( direction.multiplyScalar(4) );

  renderer.render(scene, camera);
}

function showCollition(data) {
  data = JSON.parse(data);
  if (data.detect === 'roam') {
    camera.position.x = x0;
    camera.position.z = z0;
    if(data.nearby.key === 'rocks') {
      var msg = "Ship" + shipName + " collision with rock " + data.nearby.id + "!";
      showMessage(msg);
    }
    if(data.nearby.key === 'bullets')
      showColorMessage('You are die by a bullet!', '#ff0000');
    showMessage("Restarted");
  }
}

function newShips(data) {
  showColorMessage("Ship" + data.id + " detected", COLORS[data.id]);
}

function showMessage(msg) {
  var msgBox = document.getElementsByClassName('log-history')[0];
  msgBox.innerHTML += new Date() + ": "+ msg + '<br />';
  msgBox.scrollTop = msgBox.scrollHeight;
}

function showColorMessage(msg, color) {
  var msgBox = document.getElementsByClassName('log-history')[0];
  var div = '<div style="color:'+color+'">' + new Date() + ": "+msg+'</div>';
  msgBox.innerHTML += div;
  msgBox.scrollTop = msgBox.scrollHeight;
}

function showRocks(data) {
  var material = new THREE.MeshBasicMaterial({
    color: 0xF3E5F5,
    wireframe: true
  });

  for (var rock of data) {
    var name = rock[0];
    var coor = JSON.parse(rock[1]).coordinates;
    var lat = coor[0];
    var lng = coor[1];

    var local_rock = scene.getObjectByName(name);
    if (local_rock) {
      if ( local_rock.geometry.type === "SphereGeometry" ) {
        scene.remove(local_rock);
      }
    } else {
      var geometry = new THREE.BoxGeometry(100, 400, 100);
      var mesh_rock  = new THREE.Mesh(geometry, material);
      mesh_rock.name = name;
      mesh_rock.position.x = lat * MTS;
      mesh_rock.position.z = lng * MTS;
      scene.add(mesh_rock);
    }
  }
}

function showShips(data) {

  for (var ship of data) {
    var name = ship[0];
    if ( name == shipName ) continue;
    var material = new THREE.MeshBasicMaterial({
      color: COLORS[Number(name)],
      wireframe: true
    });
    var coor = JSON.parse(ship[1]).coordinates;
    var lat = coor[0] * MTS;
    var lng = coor[1] * MTS;
    var local_ship = scene.getObjectByName(name);
    if (local_ship) {
      if (local_ship.geometry.type === "BoxGeometry") {
        scene.remove(local_ship);
        local_ship = false;
      }
    }
    if (!local_ship) {
      var geometry = new THREE.SphereGeometry(30, 20, 10);
      local_ship = new THREE.Mesh(geometry, material);
      local_ship.name = name;
      scene.add(local_ship);
    }
    local_ship.position.x = lat;
    local_ship.position.z = lng;
  }
}

function showBullets(data) {
  for (var bullet of data) {
    var name = bullet[0];

    var material = new THREE.MeshBasicMaterial({
      color: "#FF0000",
      wireframe: true
    });

    var coor = JSON.parse(bullet[1]).coordinates;
    var lat = coor[0] * MTS;
    var lng = coor[1] * MTS;
    var local_bullet = scene.getObjectByName(name);

    if (!local_bullet) {
      var geometry = new THREE.CylinderGeometry(2, 2, 16, 10);
      local_bullet = new THREE.Mesh(geometry, material);
      local_bullet.name = name;
      scene.add(local_bullet);
      removeByName(name, 8000);

      if ( bullet[2] ) {
        var latDirection = bullet[2][1];
        var lngDirection = bullet[2][3];
        local_bullet.up.x = latDirection;
        local_bullet.up.z = lngDirection;
        local_bullet.up.y = 0;
        local_bullet.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(latDirection, 0, lngDirection)
        );
      }
    }
    local_bullet.position.x = lat;
    local_bullet.position.z = lng;
  }
}

function removeByName(name, time) {
  var to_remove = scene.getObjectByName(name);
  setTimeout(function() {
    scene.remove(to_remove);
  }, time);
}
