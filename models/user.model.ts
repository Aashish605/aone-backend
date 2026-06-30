import { DataTypes, Model, Optional } from 'sequelize';
<<<<<<< HEAD
import sequelize from '../config/db.config.js';
=======
import sequelize from '../config/db.config';
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28
import bcrypt from 'bcryptjs';

interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
<<<<<<< HEAD
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role'> {}

interface UserInstance extends Model<UserAttributes, UserCreationAttributes>, UserAttributes {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const User = sequelize.define<UserInstance>('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user: UserInstance) => {
      user.password = await bcrypt.hash(user.password, 10);
    },
  },
});

(User.prototype as UserInstance).comparePassword = async function (this: UserInstance, candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

(User.prototype as UserInstance).toJSON = function (this: UserInstance) {
  const { password: _password, ...rest } = this.get();
  return rest;
};
=======
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

class User extends Model<UserAttributes, UserCreationAttributes> {
  declare id: string;
  declare name: string;
  declare email: string;
  declare password: string;
  declare role: string;

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  toJSON(): Record<string, unknown> {
    const { password, ...rest } = this.get();
    return rest;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
    },
  },
  {
    sequelize,
    timestamps: true,
    hooks: {
      beforeCreate: async (user: User) => {
        user.password = await bcrypt.hash(user.password, 10);
      },
    },
  }
);
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28

export default User;
